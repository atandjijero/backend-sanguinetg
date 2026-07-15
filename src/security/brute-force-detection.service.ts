import { Injectable } from '@nestjs/common';
import { SecurityAlertsService } from './security-alerts.service';

const SEUIL_TENTATIVES = 5;
const FENETRE_MS = 5 * 60 * 1000;

/**
 * Détection best-effort en mémoire (suffisante pour un pilote mono-instance).
 * Une vraie mise à l'échelle multi-instances nécessiterait un store partagé (Redis).
 */
@Injectable()
export class BruteForceDetectionService {
  private readonly tentatives = new Map<string, { count: number; premiereTentative: number }>();

  constructor(private readonly securityAlerts: SecurityAlertsService) {}

  async signalerEchec(
    ip: string,
    uri: string,
    contexte?: { identifiant?: string; userAgent?: string | null },
  ) {
    const maintenant = Date.now();
    const entree = this.tentatives.get(ip);

    if (!entree || maintenant - entree.premiereTentative > FENETRE_MS) {
      this.tentatives.set(ip, { count: 1, premiereTentative: maintenant });
      return;
    }

    entree.count += 1;

    if (entree.count === SEUIL_TENTATIVES) {
      await this.securityAlerts.enregistrer({
        type: 'BRUTE_FORCE',
        gravite: 'ELEVE',
        message: `Activité suspecte : ${SEUIL_TENTATIVES} tentatives de connexion échouées en moins de 5 minutes depuis la même adresse IP.`,
        ipSource: ip,
        uri,
        userAgent: contexte?.userAgent ?? null,
        payload: contexte?.identifiant ? { identifiant: contexte.identifiant } : undefined,
      });
    }
  }

  reinitialiser(ip: string) {
    this.tentatives.delete(ip);
  }
}
