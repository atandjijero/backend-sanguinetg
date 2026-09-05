import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import type { JwtPayload } from '../auth/types/authenticated-user.interface';
import { HeartbeatDto } from './dto/heartbeat.dto';

const SEUIL_EN_LIGNE_MS = 5 * 60 * 1000;
const FENETRE_VU_RECEMMENT_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly repository: RepositoryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async heartbeat(dto: HeartbeatDto, authHeader?: string) {
    const utilisateurId = this.extraireUtilisateurId(authHeader);

    await this.repository.sessionVisite.upsert({
      where: { sessionId: dto.sessionId },
      create: { sessionId: dto.sessionId, utilisateurId },
      // deconnecteA remis à null : une reprise d'activité (reconnexion sur le même appareil)
      // annule le statut hors-ligne explicite posé par un précédent clic "Se déconnecter".
      update: { derniereActivite: new Date(), utilisateurId, pagesVues: { increment: 1 }, deconnecteA: null },
    });

    return { ok: true };
  }

  /** Marque la session comme explicitement déconnectée, pour un statut hors-ligne immédiat côté front. */
  async signalerDeconnexion(sessionId: string) {
    await this.repository.sessionVisite.updateMany({
      where: { sessionId },
      data: { deconnecteA: new Date() },
    });
    return { ok: true };
  }

  async stats() {
    const seuil = new Date(Date.now() - SEUIL_EN_LIGNE_MS);

    const [enLigne, connectes, recents] = await Promise.all([
      this.repository.sessionVisite.count({ where: { derniereActivite: { gte: seuil }, deconnecteA: null } }),
      this.repository.sessionVisite.count({
        where: { derniereActivite: { gte: seuil }, deconnecteA: null, utilisateurId: { not: null } },
      }),
      this.repository.sessionVisite.findMany({
        where: { derniereActivite: { gte: seuil }, deconnecteA: null, utilisateurId: { not: null } },
        orderBy: { derniereActivite: 'desc' },
        take: 3,
        select: { utilisateur: { select: { id: true, nom: true, prenom: true } } },
      }),
    ]);

    return {
      enLigne,
      connectes,
      anonymes: enLigne - connectes,
      recents: recents.map((s) => s.utilisateur!),
    };
  }

  async sessionsRecentes(jours = 14) {
    const depuis = new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
    depuis.setHours(0, 0, 0, 0);

    const sessions = await this.repository.sessionVisite.findMany({
      where: { premiereActivite: { gte: depuis } },
      select: { premiereActivite: true, utilisateurId: true },
    });

    return sessions;
  }

  /**
   * Statut « en ligne / vu récemment » (façon WhatsApp) sur les 7 derniers jours. enLigne est
   * calculé ici (pas côté front) car une déconnexion explicite (deconnecteA) doit basculer le
   * statut immédiatement, même si derniereActivite reste dans le seuil des 5 dernières minutes.
   */
  async connectes() {
    const seuil = new Date(Date.now() - FENETRE_VU_RECEMMENT_MS);
    const seuilEnLigne = new Date(Date.now() - SEUIL_EN_LIGNE_MS);

    const sessions = await this.repository.sessionVisite.findMany({
      where: { derniereActivite: { gte: seuil }, utilisateurId: { not: null } },
      orderBy: { derniereActivite: 'desc' },
      select: {
        derniereActivite: true,
        deconnecteA: true,
        utilisateur: { select: { id: true, nom: true, prenom: true, role: true } },
      },
    });

    // Un même utilisateur peut avoir plusieurs sessions (appareils/onglets) sur la période ;
    // la liste étant triée par date décroissante, la première rencontrée par utilisateur
    // est forcément sa dernière activité connue.
    const parUtilisateur = new Map<
      string,
      { id: string; nom: string; prenom: string; role: Role; derniereActivite: Date; enLigne: boolean }
    >();
    for (const s of sessions) {
      const utilisateur = s.utilisateur!;
      if (parUtilisateur.has(utilisateur.id)) continue;

      const enLigne = !s.deconnecteA && s.derniereActivite >= seuilEnLigne;
      parUtilisateur.set(utilisateur.id, {
        ...utilisateur,
        derniereActivite: s.deconnecteA ?? s.derniereActivite,
        enLigne,
      });
    }

    return [...parUtilisateur.values()];
  }

  private extraireUtilisateurId(authHeader?: string): string | undefined {
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      return payload.sub;
    } catch (error) {
      // Token absent, expiré ou invalide → session traitée comme anonyme, non bloquant.
      this.logger.debug(`Heartbeat avec jeton invalide ignoré : ${(error as Error).message}`);
      return undefined;
    }
  }
}
