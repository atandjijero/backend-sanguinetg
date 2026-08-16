import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role, TypeRecompense } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { MailService } from '../common/mail/mail.service';
import { PushService } from '../common/push/push.service';
import { TYPE_RECOMPENSE_LABELS } from './recompense-labels';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateRecompenseDto } from './dto/create-recompense.dto';
import { FindRecompensesQuery } from './dto/find-recompenses.query';
import { UpdateRecompenseStatutDto } from './dto/update-recompense-statut.dto';

@Injectable()
export class RecompensesService {
  private readonly logger = new Logger(RecompensesService.name);

  constructor(
    private readonly repository: RepositoryService,
    private readonly mail: MailService,
    private readonly push: PushService,
  ) {}

  async create(dto: CreateRecompenseDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN consulte les récompenses mais ne les attribue pas : action réservée aux rôles opérationnels CNTS.",
      );
    }

    const recompense = await this.creerRecompense(dto, user);

    void this.notifierDonneur(recompense).catch((error: unknown) =>
      this.logger.warn(`Notification de récompense non envoyée pour ${recompense.donneurId} : ${error}`),
    );

    return recompense;
  }

  private async creerRecompense(dto: CreateRecompenseDto, user: AuthenticatedUser) {
    try {
      return await this.repository.recompense.create({
        data: {
          donneurId: dto.donneurId,
          type: dto.type,
          description: dto.description,
          critereAttribution: dto.critereAttribution,
          attribueParId: user.id,
        },
        include: { donneur: { select: { id: true, prenom: true, email: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Le donneur sélectionné est invalide.');
      }
      throw error;
    }
  }

  findAll(query: FindRecompensesQuery, user: AuthenticatedUser) {
    const donneurId = user.role === Role.DONNEUR ? user.id : query.donneurId;

    return this.repository.recompense.findMany({
      where: { donneurId, type: query.type, statut: query.statut },
      include: {
        donneur: { select: { id: true, nom: true, prenom: true, groupeSanguin: true } },
        attribuePar: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { dateAttribution: 'desc' },
    });
  }

  private async notifierDonneur(recompense: {
    id: string;
    type: TypeRecompense;
    donneurId: string;
    donneur: { prenom: string; email: string | null };
  }) {
    const label = TYPE_RECOMPENSE_LABELS[recompense.type];
    const documentaire = recompense.type === 'BADGE' || recompense.type === 'CERTIFICAT';
    const contenu = documentaire
      ? `Bonjour ${recompense.donneur.prenom}, vous avez reçu un(e) ${label.toLowerCase()} ! Rendez-vous dans "Mes récompenses" pour le télécharger. Merci pour votre engagement auprès du CNTS !`
      : `Bonjour ${recompense.donneur.prenom}, vous avez reçu une récompense (${label.toLowerCase()}) suite à votre engagement auprès du CNTS. Merci !`;

    const emailEnvoye = recompense.donneur.email
      ? await this.mail.envoyer({ to: recompense.donneur.email, subject: 'Sanguine TG · Vous avez reçu une récompense', text: contenu })
      : false;

    void this.push.envoyerA(recompense.donneurId, { title: 'Sanguine TG', body: contenu, url: '/espace-donneur/recompenses' });

    await this.repository.notification.create({
      data: { donneurId: recompense.donneurId, alerteId: null, type: 'PUSH', contenu, emailEnvoye },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const recompense = await this.repository.recompense.findUnique({ where: { id } });
    if (!recompense) {
      throw new NotFoundException('Récompense introuvable');
    }
    if (user.role === Role.DONNEUR && recompense.donneurId !== user.id) {
      throw new NotFoundException('Récompense introuvable');
    }
    return recompense;
  }

  async updateStatut(id: string, dto: UpdateRecompenseStatutDto) {
    await this.getOrThrow(id);
    return this.repository.recompense.update({ where: { id }, data: { statut: dto.statut } });
  }

  private async getOrThrow(id: string) {
    const recompense = await this.repository.recompense.findUnique({ where: { id } });
    if (!recompense) {
      throw new NotFoundException('Récompense introuvable');
    }
    return recompense;
  }
}
