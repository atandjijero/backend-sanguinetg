import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RepositoryService } from '../repository/repository.service';
import { durationToSeconds } from '../common/utils/duration.util';
import { BruteForceDetectionService } from '../security/brute-force-detection.service';
import { MailService } from '../common/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { genererEmailReinitialisation } from './reset-password-email.template';
import { genererEmailVerification } from './email-verification.template';
import type { JwtPayload } from './types/authenticated-user.interface';

const SALT_ROUNDS = 12;

interface TokenReinitialisation {
  type: 'reset_password';
  sub: string;
}

interface TokenVerificationEmail {
  type: 'email_verification';
  sub: string;
}

const PUBLIC_USER_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  role: true,
  statut: true,
  groupeSanguin: true,
  quartierId: true,
  dateInscription: true,
} satisfies Prisma.UtilisateurSelect;

type PublicUser = Prisma.UtilisateurGetPayload<{
  select: typeof PUBLIC_USER_SELECT;
}>;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly bruteForceDetection: BruteForceDetectionService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const motDePasseHache = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);

    let user: PublicUser;
    try {
      user = await this.repository.utilisateur.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          telephone: dto.telephone,
          motDePasse: motDePasseHache,
          role: 'DONNEUR',
          groupeSanguin: dto.groupeSanguin,
          quartierId: dto.quartierId,
          consentementDate: new Date(),
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Un compte existe déjà avec cet email ou ce numéro de téléphone.',
          );
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Le quartier sélectionné est invalide.');
        }
      }
      throw error;
    }

    await this.envoyerEmailVerification(user);

    return {
      message:
        'Compte créé. Vérifiez votre email pour activer votre compte avant de vous connecter.',
    };
  }

  private async envoyerEmailVerification(user: {
    id: string;
    prenom: string;
    email: string | null;
  }) {
    if (!user.email) return;

    const token = this.jwtService.sign(
      {
        type: 'email_verification',
        sub: user.id,
      } satisfies TokenVerificationEmail,
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '24h',
      },
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const lienVerification = `${frontendUrl}/verifier-email?token=${token}`;

    await this.mailService.envoyer({
      to: user.email,
      subject: 'Vérifiez votre email · Sanguine TG',
      text: `Bonjour ${user.prenom}, activez votre compte Sanguine TG via ce lien (valable 24h) : ${lienVerification}`,
      html: genererEmailVerification({ prenom: user.prenom, lienVerification }),
    });
  }

  async verifierEmail(token: string): Promise<{ message: string }> {
    let payload: TokenVerificationEmail;
    try {
      payload = this.jwtService.verify<TokenVerificationEmail>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException(
        'Ce lien de vérification est invalide ou a expiré.',
      );
    }

    if (payload.type !== 'email_verification') {
      throw new BadRequestException('Ce lien de vérification est invalide.');
    }

    await this.repository.utilisateur.update({
      where: { id: payload.sub },
      data: { emailVerifie: true },
    });

    return {
      message:
        'Email vérifié avec succès, vous pouvez maintenant vous connecter.',
    };
  }

  async login(
    identifiant: string,
    motDePasse: string,
    ip?: string,
    userAgent?: string | null,
  ): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const utilisateur = await this.repository.utilisateur.findFirst({
      where: { OR: [{ email: identifiant }, { telephone: identifiant }] },
    });

    if (!utilisateur || !utilisateur.motDePasse) {
      if (ip)
        await this.bruteForceDetection.signalerEchec(ip, '/auth/login', {
          identifiant,
          userAgent,
        });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte désactivé, contactez le CNTS');
    }

    const motDePasseValide = await bcrypt.compare(
      motDePasse,
      utilisateur.motDePasse,
    );
    if (!motDePasseValide) {
      if (ip)
        await this.bruteForceDetection.signalerEchec(ip, '/auth/login', {
          identifiant,
          userAgent,
        });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (ip) this.bruteForceDetection.reinitialiser(ip);

    if (!utilisateur.emailVerifie) {
      throw new UnauthorizedException(
        'Veuillez vérifier votre adresse email avant de vous connecter.',
      );
    }

    const tokens = this.issueTokens({
      sub: utilisateur.id,
      role: utilisateur.role,
      email: utilisateur.email,
    });
    const user = await this.repository.utilisateur.findUniqueOrThrow({
      where: { id: utilisateur.id },
      select: PUBLIC_USER_SELECT,
    });
    return { user, tokens };
  }

  async refresh(payload: JwtPayload): Promise<TokenPair> {
    const utilisateur = await this.repository.utilisateur.findUnique({
      where: { id: payload.sub },
    });

    if (!utilisateur || utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    return this.issueTokens({
      sub: utilisateur.id,
      role: utilisateur.role,
      email: utilisateur.email,
    });
  }

  /**
   * Envoie un email de réinitialisation si un compte correspond à l'identifiant fourni.
   * Réponse toujours identique en cas de succès ou d'échec silencieux, pour ne pas révéler
   * si un email/téléphone est associé à un compte existant.
   */
  async demanderReinitialisation(
    identifiant: string,
  ): Promise<{ message: string }> {
    const message =
      'Si un compte existe, un email de réinitialisation a été envoyé.';

    const utilisateur = await this.repository.utilisateur.findFirst({
      where: { OR: [{ email: identifiant }, { telephone: identifiant }] },
    });

    if (!utilisateur || !utilisateur.email) {
      return { message };
    }

    const token = this.jwtService.sign(
      {
        type: 'reset_password',
        sub: utilisateur.id,
      } satisfies TokenReinitialisation,
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const lienReinitialisation = `${frontendUrl}/reinitialiser-mot-de-passe?token=${token}`;

    await this.mailService.envoyer({
      to: utilisateur.email,
      subject: 'Réinitialisation de votre mot de passe Sanguine TG',
      text: `Bonjour ${utilisateur.prenom}, réinitialisez votre mot de passe via ce lien (valable 1h) : ${lienReinitialisation}`,
      html: genererEmailReinitialisation({
        prenom: utilisateur.prenom,
        lienReinitialisation,
      }),
    });

    return { message };
  }

  async reinitialiserMotDePasse(
    token: string,
    nouveauMotDePasse: string,
  ): Promise<{ message: string }> {
    let payload: TokenReinitialisation;
    try {
      payload = this.jwtService.verify<TokenReinitialisation>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException(
        'Ce lien de réinitialisation est invalide ou a expiré.',
      );
    }

    if (payload.type !== 'reset_password') {
      throw new BadRequestException(
        'Ce lien de réinitialisation est invalide.',
      );
    }

    const motDePasseHache = await bcrypt.hash(nouveauMotDePasse, SALT_ROUNDS);
    await this.repository.utilisateur.update({
      where: { id: payload.sub },
      data: { motDePasse: motDePasseHache },
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  private issueTokens(payload: JwtPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: durationToSeconds(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!,
      ),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: durationToSeconds(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!,
      ),
    });

    return { accessToken, refreshToken };
  }
}
