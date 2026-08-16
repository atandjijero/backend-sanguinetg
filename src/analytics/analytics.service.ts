import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RepositoryService } from '../repository/repository.service';
import type { JwtPayload } from '../auth/types/authenticated-user.interface';
import { HeartbeatDto } from './dto/heartbeat.dto';

const SEUIL_EN_LIGNE_MS = 5 * 60 * 1000;

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
      update: { derniereActivite: new Date(), utilisateurId, pagesVues: { increment: 1 } },
    });

    return { ok: true };
  }

  async stats() {
    const seuil = new Date(Date.now() - SEUIL_EN_LIGNE_MS);

    const [enLigne, connectes, recents] = await Promise.all([
      this.repository.sessionVisite.count({ where: { derniereActivite: { gte: seuil } } }),
      this.repository.sessionVisite.count({
        where: { derniereActivite: { gte: seuil }, utilisateurId: { not: null } },
      }),
      this.repository.sessionVisite.findMany({
        where: { derniereActivite: { gte: seuil }, utilisateurId: { not: null } },
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

  async connectes() {
    const seuil = new Date(Date.now() - SEUIL_EN_LIGNE_MS);

    const sessions = await this.repository.sessionVisite.findMany({
      where: { derniereActivite: { gte: seuil }, utilisateurId: { not: null } },
      orderBy: { derniereActivite: 'desc' },
      select: {
        derniereActivite: true,
        utilisateur: { select: { id: true, nom: true, prenom: true, role: true } },
      },
    });

    return sessions.map((s) => ({ ...s.utilisateur!, derniereActivite: s.derniereActivite }));
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
