import {
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
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/authenticated-user.interface';

const SALT_ROUNDS = 12;

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

type PublicUser = Prisma.UtilisateurGetPayload<{ select: typeof PUBLIC_USER_SELECT }>;

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
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser; tokens: TokenPair }> {
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
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Un compte existe déjà avec cet email ou ce numéro de téléphone.');
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Le quartier sélectionné est invalide.');
        }
      }
      throw error;
    }

    const tokens = this.issueTokens({ sub: user.id, role: user.role, email: user.email });
    return { user, tokens };
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
      if (ip) await this.bruteForceDetection.signalerEchec(ip, '/auth/login', { identifiant, userAgent });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte désactivé, contactez le CNTS');
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!motDePasseValide) {
      if (ip) await this.bruteForceDetection.signalerEchec(ip, '/auth/login', { identifiant, userAgent });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (ip) this.bruteForceDetection.reinitialiser(ip);

    const tokens = this.issueTokens({ sub: utilisateur.id, role: utilisateur.role, email: utilisateur.email });
    const user = await this.repository.utilisateur.findUniqueOrThrow({
      where: { id: utilisateur.id },
      select: PUBLIC_USER_SELECT,
    });
    return { user, tokens };
  }

  async refresh(payload: JwtPayload): Promise<TokenPair> {
    const utilisateur = await this.repository.utilisateur.findUnique({ where: { id: payload.sub } });

    if (!utilisateur || utilisateur.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    return this.issueTokens({ sub: utilisateur.id, role: utilisateur.role, email: utilisateur.email });
  }

  private issueTokens(payload: JwtPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: durationToSeconds(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: durationToSeconds(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!),
    });

    return { accessToken, refreshToken };
  }
}
