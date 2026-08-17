import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { MailService } from '../common/mail/mail.service';
import { PushService } from '../common/push/push.service';
import { CacheService } from '../common/cache/cache.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateCarnetDto } from './dto/create-carnet.dto';
import { FindCarnetsQuery } from './dto/find-carnets.query';
import { UpdateCarnetDto } from './dto/update-carnet.dto';

const DELAI_MINIMAL_ENTRE_DONS_JOURS = 90;
/** Le rappel est envoyé quelques jours avant la date d'éligibilité, pour laisser au donneur le temps de s'organiser. */
const ANTICIPATION_RAPPEL_JOURS = 3;

export interface StatistiquesFidelisation {
  totalDonneurs: number;
  donneursRecurrents: number;
  tauxDonsRepetes: number | null;
  donneursEligiblesRetention: number;
  tauxRetention: number | null;
  joursPeriode: number;
}

@Injectable()
export class CarnetsService {
  private readonly logger = new Logger(CarnetsService.name);

  constructor(
    private readonly repository: RepositoryService,
    private readonly mail: MailService,
    private readonly push: PushService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateCarnetDto) {
    const dateDon = new Date(dto.dateDon);
    const rappelProchaineDate = dto.rappelProchaineDate
      ? new Date(dto.rappelProchaineDate)
      : new Date(
          dateDon.getTime() +
            DELAI_MINIMAL_ENTRE_DONS_JOURS * 24 * 60 * 60 * 1000,
        );

    await this.verifierDelaiReglementaire(dto.donneurId, dateDon);

    try {
      return await this.repository.carnetDigital.create({
        data: {
          donneurId: dto.donneurId,
          dateDon,
          centreDonId: dto.centreDonId,
          messageRemerciement: dto.messageRemerciement,
          rappelProchaineDate,
          reponseId: dto.reponseId,
        },
        include: { recompense: true, centreDon: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  /**
   * Délai réglementaire CNTS : 90 jours minimum entre deux dons de sang total pour un même
   * donneur. Vérifie l'écart avec le don précédent et le don suivant (cas d'une saisie
   * rétroactive hors ordre chronologique) pour empêcher tout doublon rapproché.
   */
  private async verifierDelaiReglementaire(donneurId: string, dateDon: Date) {
    const delaiMs = DELAI_MINIMAL_ENTRE_DONS_JOURS * 24 * 60 * 60 * 1000;

    const [precedent, suivant] = await Promise.all([
      this.repository.carnetDigital.findFirst({
        where: { donneurId, dateDon: { lte: dateDon } },
        orderBy: { dateDon: 'desc' },
      }),
      this.repository.carnetDigital.findFirst({
        where: { donneurId, dateDon: { gte: dateDon } },
        orderBy: { dateDon: 'asc' },
      }),
    ]);

    if (
      precedent &&
      dateDon.getTime() - precedent.dateDon.getTime() < delaiMs
    ) {
      const prochainePossible = new Date(precedent.dateDon.getTime() + delaiMs);
      throw new ConflictException(
        `Ce donneur a déjà un don enregistré le ${precedent.dateDon.toLocaleDateString('fr-FR')}. Le délai réglementaire de ${DELAI_MINIMAL_ENTRE_DONS_JOURS} jours entre deux dons n'est pas écoulé : prochain don possible à partir du ${prochainePossible.toLocaleDateString('fr-FR')}.`,
      );
    }

    if (suivant && suivant.dateDon.getTime() - dateDon.getTime() < delaiMs) {
      throw new ConflictException(
        `Ce donneur a déjà un don enregistré le ${suivant.dateDon.toLocaleDateString('fr-FR')}, à moins de ${DELAI_MINIMAL_ENTRE_DONS_JOURS} jours de la date saisie. Le délai réglementaire entre deux dons n'est pas respecté.`,
      );
    }
  }

  findAll(query: FindCarnetsQuery, user: AuthenticatedUser) {
    const donneurId = user.role === Role.DONNEUR ? user.id : query.donneurId;

    return this.repository.carnetDigital.findMany({
      where: { donneurId },
      include: {
        recompense: true,
        centreDon: true,
        donneur: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { dateDon: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const carnet = await this.repository.carnetDigital.findUnique({
      where: { id },
      include: { recompense: true, centreDon: true },
    });
    if (
      !carnet ||
      (user.role === Role.DONNEUR && carnet.donneurId !== user.id)
    ) {
      throw new NotFoundException('Entrée de carnet introuvable');
    }
    return carnet;
  }

  async update(id: string, dto: UpdateCarnetDto) {
    await this.getOrThrow(id);
    try {
      return await this.repository.carnetDigital.update({
        where: { id },
        data: {
          centreDonId: dto.centreDonId,
          messageRemerciement: dto.messageRemerciement,
          rappelProchaineDate: dto.rappelProchaineDate
            ? new Date(dto.rappelProchaineDate)
            : undefined,
          recompenseId: dto.recompenseId,
        },
        include: { recompense: true, centreDon: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  /**
   * Indicateurs H2 (mémoire, tableau 2) : taux de dons répétés (donneurs ayant donné au moins
   * deux fois parmi tous les donneurs inscrits) et taux de rétention (donneurs inscrits depuis
   * plus de `joursPeriode` jours ayant eu une activité récente sur la plateforme).
   */
  async statistiquesFidelisation(
    joursPeriode = 90,
  ): Promise<StatistiquesFidelisation> {
    const cle = `stats:fidelisation:${joursPeriode}`;
    const enCache = await this.cache.get<StatistiquesFidelisation>(cle);
    if (enCache) return enCache;

    const resultat = await this.calculerStatistiquesFidelisation(joursPeriode);
    await this.cache.set(cle, resultat, 300);
    return resultat;
  }

  private async calculerStatistiquesFidelisation(
    joursPeriode: number,
  ): Promise<StatistiquesFidelisation> {
    const [totalDonneurs, dons, donneursAnciens] = await Promise.all([
      this.repository.utilisateur.count({ where: { role: 'DONNEUR' } }),
      this.repository.carnetDigital.groupBy({
        by: ['donneurId'],
        _count: { _all: true },
      }),
      this.repository.utilisateur.findMany({
        where: {
          role: 'DONNEUR',
          dateInscription: {
            lte: new Date(Date.now() - joursPeriode * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true },
      }),
    ]);

    const donneursRecurrents = dons.filter((d) => d._count._all >= 2).length;
    const tauxDonsRepetes =
      totalDonneurs > 0
        ? Math.round((donneursRecurrents / totalDonneurs) * 100)
        : null;

    let tauxRetention: number | null = null;
    if (donneursAnciens.length > 0) {
      const seuilActivite = new Date(
        Date.now() - joursPeriode * 24 * 60 * 60 * 1000,
      );
      const actifsRecemment = await this.repository.sessionVisite.findMany({
        where: {
          utilisateurId: { in: donneursAnciens.map((d) => d.id) },
          derniereActivite: { gte: seuilActivite },
        },
        select: { utilisateurId: true },
        distinct: ['utilisateurId'],
      });
      tauxRetention = Math.round(
        (actifsRecemment.length / donneursAnciens.length) * 100,
      );
    }

    return {
      totalDonneurs,
      donneursRecurrents,
      tauxDonsRepetes,
      donneursEligiblesRetention: donneursAnciens.length,
      tauxRetention,
      joursPeriode,
    };
  }

  /**
   * Rappelle (email + push) aux donneurs actifs dont la date de prochaine éligibilité au don
   * approche (ou est dépassée) et qui n'ont pas encore reçu ce rappel — un seul envoi par
   * carnet, marqué via `rappelEnvoye` pour ne jamais redéranger deux fois pour la même date.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async envoyerRappelsProchainDon() {
    const seuil = new Date(
      Date.now() + ANTICIPATION_RAPPEL_JOURS * 24 * 60 * 60 * 1000,
    );
    const carnets = await this.repository.carnetDigital.findMany({
      where: {
        rappelEnvoye: false,
        rappelProchaineDate: { lte: seuil },
        donneur: { statut: 'ACTIF' },
      },
      select: {
        id: true,
        rappelProchaineDate: true,
        donneur: { select: { id: true, prenom: true, email: true } },
      },
    });

    for (const carnet of carnets) {
      const dateLabel = carnet.rappelProchaineDate!.toLocaleDateString('fr-FR');
      const contenu = `Bonjour ${carnet.donneur.prenom}, vous serez de nouveau éligible pour un don de sang à partir du ${dateLabel}. Merci pour votre engagement auprès du CNTS !`;

      const emailEnvoye = carnet.donneur.email
        ? await this.mail.envoyer({
            to: carnet.donneur.email,
            subject: 'Sanguine TG · Votre prochain don approche',
            text: contenu,
          })
        : false;

      await this.repository.notification.create({
        data: {
          donneurId: carnet.donneur.id,
          alerteId: null,
          type: 'PUSH',
          contenu,
          emailEnvoye,
        },
      });

      void this.push.envoyerA(carnet.donneur.id, {
        title: 'Sanguine TG',
        body: contenu,
        url: '/espace-donneur/carnet',
      });

      await this.repository.carnetDigital.update({
        where: { id: carnet.id },
        data: { rappelEnvoye: true },
      });
    }

    if (carnets.length > 0) {
      this.logger.log(`${carnets.length} rappel(s) de prochain don envoyé(s).`);
    }
    return carnets.length;
  }

  private async getOrThrow(id: string) {
    const carnet = await this.repository.carnetDigital.findUnique({
      where: { id },
    });
    if (!carnet) {
      throw new NotFoundException('Entrée de carnet introuvable');
    }
    return carnet;
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Cette réponse ou cette récompense est déjà liée à un autre carnet.',
        );
      }
      if (error.code === 'P2003') {
        return new BadRequestException(
          'Le donneur, le centre de don, la réponse ou la récompense référencé(e) est invalide.',
        );
      }
    }
    return error as Error;
  }
}
