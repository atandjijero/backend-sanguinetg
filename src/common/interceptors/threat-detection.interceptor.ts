import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import { SecurityAlertsService } from '../../security/security-alerts.service';
import { ThreatDetectionService } from '../../security/threat-detection.service';

/**
 * Inspecte le corps de chaque requête entrante à la recherche de motifs
 * d'injection SQL / XSS classiques. Prisma paramétrise déjà toutes les requêtes
 * (pas d'injection SQL possible) et React échappe le rendu (pas de XSS au rendu) :
 * cette couche sert à détecter et journaliser les TENTATIVES, pas à combler une
 * faille qui n'existe pas — défense en profondeur + visibilité pour le SUPERADMIN.
 */
@Injectable()
export class ThreatDetectionInterceptor implements NestInterceptor {
  constructor(
    private readonly threatDetection: ThreatDetectionService,
    private readonly securityAlerts: SecurityAlertsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    const resultat = this.threatDetection.detecterDansObjet(request.body);

    if (resultat) {
      void this.securityAlerts.enregistrer({
        type: resultat.type,
        gravite: resultat.type === 'SQL_INJECTION' ? 'CRITIQUE' : 'ELEVE',
        message:
          resultat.type === 'SQL_INJECTION'
            ? `Tentative d'injection SQL détectée et bloquée dans la requête : "${resultat.extrait}"`
            : `Tentative XSS détectée et bloquée dans la requête : "${resultat.extrait}"`,
        ipSource: request.ip ?? null,
        uri: request.originalUrl,
        userAgent: request.headers['user-agent'] ?? null,
        payload: request.body ?? undefined,
      });

      throw new BadRequestException('Requête rejetée : contenu suspect détecté.');
    }

    return next.handle();
  }
}
