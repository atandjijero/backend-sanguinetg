import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  formatGroupeSanguin,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isDonneurCompatible,
} from '../common/constants/blood-compatibility';
import { RepositoryService } from '../repository/repository.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { CreateReponseDto } from './dto/create-reponse.dto';
import { FindAlertesQuery } from './dto/find-alertes.query';
import { UpdateAlerteStatutDto } from './dto/update-alerte-statut.dto';

const ALERTE_INCLUDE = {
  quartier: true,
  creePar: { select: { id: true, nom: true, prenom: true } },
} satisfies Prisma.AlerteInclude;

@Injectable()
export class AlertesService {
  constructor(private readonly repository: RepositoryService) {}

  
  // Crée une alerte par combinaison (groupe sanguin × quartier) — chaque combinaison
   //cible et notifie un ensemble de donneurs distinct, donc reste une Alerte séparée
   //(fermeture/suivi indépendants) même quand elles sont lancées en un seul geste.
   
  async create(dto: CreateAlerteDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN administre la plateforme mais ne lance pas d'alerte : cette action est réservée aux rôles opérationnels CNTS (agent, admin).",
      );
    }

    const resultats: Awaited<ReturnType<typeof this.creerUneAlerte>>[] = [];
    for (const groupeSanguinRequis of dto.groupesSanguinsRequis) {
      for (const quartierId of dto.quartierIds) {
        resultats.push(await this.creerUneAlerte(groupeSanguinRequis, quartierId, dto.rayonKm, user.id));
      }
    }
    return resultats;
  }

  private async creerUneAlerte(groupeSanguinRequis: Prisma.AlerteGetPayload<object>['groupeSanguinRequis'], quartierId: string, rayonKm: number | undefined, agentId: string) {
    let alerte;
    try {
      alerte = await this.repository.alerte.create({
        data: { groupeSanguinRequis, quartierId, rayonKm, creeParId: agentId },
        include: ALERTE_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Le quartier sélectionné (${quartierId}) est invalide.`);
      }
      throw error;
    }

    const donneursCibles = await this.notifierDonneursCibles(alerte);
    return { ...alerte, donneursNotifies: donneursCibles };
  }

  async findAll(query: FindAlertesQuery, user: AuthenticatedUser) {
    if (user.role === Role.DONNEUR) {
      return this.findAllPourDonneur(user.id);
    }

    return this.repository.alerte.findMany({
      where: {
        statut: query.statut,
        groupeSanguinRequis: query.groupeSanguinRequis,
        quartierId: query.quartierId,
      },
      include: {
        ...ALERTE_INCLUDE,
        _count: { select: { reponses: true } },
      },
      orderBy: { dateCreation: 'desc' },
      take: 100,
    });
  }

  private async findAllPourDonneur(donneurId: string) {
    const donneur = await this.repository.utilisateur.findUnique({
      where: { id: donneurId },
      select: { groupeSanguin: true, quartierId: true },
    });

    if (!donneur?.groupeSanguin || !donneur.quartierId) {
      return [];
    }

    return this.repository.alerte.findMany({
      where: {
        statut: 'OUVERTE',
        quartierId: donneur.quartierId,
        groupeSanguinRequis: { in: getCompatibleRecipientGroups(donneur.groupeSanguin) },
      },
      include: ALERTE_INCLUDE,
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const alerte = await this.repository.alerte.findUnique({ where: { id }, include: ALERTE_INCLUDE });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    if (user.role === Role.DONNEUR) {
      const maReponse = await this.repository.reponse.findUnique({
        where: { alerteId_donneurId: { alerteId: id, donneurId: user.id } },
      });
      return { ...alerte, maReponse: maReponse?.statut ?? null };
    }

    const [jeViens, indisponible] = await Promise.all([
      this.repository.reponse.count({ where: { alerteId: id, statut: 'JE_VIENS' } }),
      this.repository.reponse.count({ where: { alerteId: id, statut: 'INDISPONIBLE' } }),
    ]);
    return { ...alerte, resume: { jeViens, indisponible } };
  }

  async updateStatut(id: string, dto: UpdateAlerteStatutDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN administre la plateforme mais ne gère pas le cycle de vie des alertes (ouverture/fermeture) : action réservée aux rôles opérationnels CNTS.",
      );
    }

    await this.getOrThrow(id);
    return this.repository.alerte.update({
      where: { id },
      data: { statut: dto.statut },
      include: ALERTE_INCLUDE,
    });
  }

  async repondre(alerteId: string, donneurId: string, dto: CreateReponseDto) {
    const alerte = await this.getOrThrow(alerteId);

    if (alerte.statut !== 'OUVERTE') {
      throw new BadRequestException('Cette alerte est fermée, votre réponse ne peut plus être enregistrée.');
    }

    const donneur = await this.repository.utilisateur.findUnique({
      where: { id: donneurId },
      select: { groupeSanguin: true },
    });

    if (!donneur?.groupeSanguin) {
      throw new BadRequestException('Complétez votre groupe sanguin avant de répondre à une alerte.');
    }

    if (!isDonneurCompatible(donneur.groupeSanguin, alerte.groupeSanguinRequis)) {
      throw new ForbiddenException("Votre groupe sanguin n'est pas compatible avec cette alerte.");
    }

    return this.repository.reponse.upsert({
      where: { alerteId_donneurId: { alerteId, donneurId } },
      create: { alerteId, donneurId, statut: dto.statut },
      update: { statut: dto.statut, dateReponse: new Date() },
    });
  }

  async findReponses(alerteId: string) {
    await this.getOrThrow(alerteId);
    return this.repository.reponse.findMany({
      where: { alerteId },
      include: {
        donneur: { select: { id: true, nom: true, prenom: true, telephone: true, groupeSanguin: true } },
      },
      orderBy: { dateReponse: 'desc' },
    });
  }

  private async getOrThrow(id: string) {
    const alerte = await this.repository.alerte.findUnique({ where: { id } });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }
    return alerte;
  }

  private async notifierDonneursCibles(alerte: {
    id: string;
    groupeSanguinRequis: Prisma.AlerteGetPayload<object>['groupeSanguinRequis'];
    quartierId: string;
    quartier?: { nom: string } | null;
  }) {
    const groupesCompatibles = getCompatibleDonorGroups(alerte.groupeSanguinRequis);

    const donneurs = await this.repository.utilisateur.findMany({
      where: {
        role: Role.DONNEUR,
        statut: 'ACTIF',
        groupeSanguin: { in: groupesCompatibles },
        quartierId: alerte.quartierId,
      },
      select: { id: true },
    });

    if (donneurs.length === 0) {
      return 0;
    }

    const quartierNom = alerte.quartier?.nom ?? 'votre quartier';
    const contenu = `Alerte don de sang : besoin urgent de ${formatGroupeSanguin(alerte.groupeSanguinRequis)} à ${quartierNom}. Répondez « Je viens » si vous êtes disponible.`;

    await this.repository.notification.createMany({
      data: donneurs.map((donneur) => ({
        donneurId: donneur.id,
        alerteId: alerte.id,
        type: 'PUSH' as const,
        contenu,
      })),
    });

    return donneurs.length;
  }
}
