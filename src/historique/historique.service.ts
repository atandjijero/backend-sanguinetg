import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { FindHistoriqueQuery } from './dto/find-historique.query';
import {
  ContexteDescription,
  chargerCible,
  decrire,
} from './historique-descriptions';

const ROLES_VISIBLES_PAR_ADMIN: Role[] = [
  Role.AGENT_CNTS,
  Role.MEDECIN,
  Role.DONNEUR,
];
const DUREE_CONSERVATION_JOURS = 365;

export interface NouvelleEntreeJournal {
  utilisateurId: string | null;
  role: Role | null;
  action: string;
  methode: string;
  route: string;
  cible: string | null;
  succes: boolean;
  codeHttp: number;
  ip: string | null;
  userAgent: string | null;
  details?: Prisma.InputJsonValue;
}

@Injectable()
export class HistoriqueService {
  private readonly logger = new Logger(HistoriqueService.name);

  constructor(private readonly repository: RepositoryService) {}

  async chargerCible(cle: string, id: string | undefined) {
    try {
      return await chargerCible(this.repository, cle, id);
    } catch {
      return null;
    }
  }

  async enregistrer(entree: NouvelleEntreeJournal, ctx: ContexteDescription) {
    try {
      const [utilisateur, description] = await Promise.all([
        entree.utilisateurId
          ? this.repository.utilisateur.findUnique({
              where: { id: entree.utilisateurId },
              select: { nom: true, prenom: true },
            })
          : null,
        decrire(this.repository, ctx).catch(() => entree.action),
      ]);

      await this.repository.journalActivite.create({
        data: {
          ...entree,
          description,
          utilisateurId: utilisateur ? entree.utilisateurId : null,
          utilisateurNom: utilisateur
            ? `${utilisateur.prenom} ${utilisateur.nom}`
            : null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Entrée d'historique non enregistrée (${entree.action}) : ${String(error)}`,
      );
    }
  }

  async findAll(query: FindHistoriqueQuery, demandeur: { role: Role }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const filtreRole: Prisma.JournalActiviteWhereInput =
      demandeur.role === Role.SUPERADMIN
        ? { role: query.role }
        : {
            role:
              query.role && ROLES_VISIBLES_PAR_ADMIN.includes(query.role)
                ? query.role
                : { in: query.role ? [] : ROLES_VISIBLES_PAR_ADMIN },
          };

    const where: Prisma.JournalActiviteWhereInput = {
      ...filtreRole,
      succes: query.succes,
      dateCreation: {
        gte: query.dateDebut ? new Date(query.dateDebut) : undefined,
        lte: query.dateFin
          ? new Date(`${query.dateFin.slice(0, 10)}T23:59:59.999Z`)
          : undefined,
      },
      ...(query.recherche
        ? {
            OR: [
              {
                utilisateurNom: {
                  contains: query.recherche,
                  mode: 'insensitive',
                },
              },
              { action: { contains: query.recherche, mode: 'insensitive' } },
              {
                description: {
                  contains: query.recherche,
                  mode: 'insensitive',
                },
              },
              { ip: { contains: query.recherche, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.repository.journalActivite.findMany({
        where,
        orderBy: { dateCreation: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          utilisateurId: true,
          utilisateurNom: true,
          role: true,
          action: true,
          description: true,
          methode: true,
          route: true,
          cible: true,
          succes: true,
          codeHttp: true,
          ip: true,
          userAgent: true,
          details: true,
          dateCreation: true,
        },
      }),
      this.repository.journalActivite.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgerAnciennesEntrees() {
    const seuil = new Date(
      Date.now() - DUREE_CONSERVATION_JOURS * 24 * 60 * 60 * 1000,
    );
    const { count } = await this.repository.journalActivite.deleteMany({
      where: { dateCreation: { lt: seuil } },
    });
    if (count > 0) {
      this.logger.log(
        `${count} entrée(s) d'historique de plus de ${DUREE_CONSERVATION_JOURS} jours supprimée(s).`,
      );
    }
  }
}
