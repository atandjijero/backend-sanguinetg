import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { Observable, catchError, from, switchMap, tap, throwError } from 'rxjs';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { LIBELLES_ACTIONS, ROUTES_IGNOREES } from './historique-actions';
import { HistoriqueService, NouvelleEntreeJournal } from './historique.service';

const METHODES_JOURNALISEES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type Auteur = { utilisateurId: string | null; role: Role | null };

@Injectable()
export class HistoriqueInterceptor implements NestInterceptor {
  constructor(private readonly historique: HistoriqueService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const res = http.getResponse<Response>();
    if (!METHODES_JOURNALISEES.has(req.method)) return next.handle();

    const routePath =
      (req.route as { path?: string } | undefined)?.path ?? req.path;
    const cle = `${req.method} ${routePath}`;
    if (ROUTES_IGNOREES.has(cle)) return next.handle();

    const body = (req.body ?? {}) as Record<string, unknown>;
    const base = {
      action: LIBELLES_ACTIONS[cle] ?? cle,
      methode: req.method,
      route: req.originalUrl.split('?')[0],
      cible: (req.params?.id ?? req.params?.cle ?? null) as string | null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };

    return from(
      this.historique.chargerCible(
        cle,
        typeof req.params?.id === 'string' ? req.params.id : undefined,
      ),
    ).pipe(
      switchMap((cibleLibelle) =>
        this.executer(next, cle, req, res, body, base, cibleLibelle),
      ),
    );
  }

  private executer(
    next: CallHandler,
    cle: string,
    req: Request & { user?: AuthenticatedUser },
    res: Response,
    body: Record<string, unknown>,
    base: Omit<
      NouvelleEntreeJournal,
      'utilisateurId' | 'role' | 'succes' | 'codeHttp'
    >,
    cibleLibelle: string | null,
  ): Observable<unknown> {
    return next.handle().pipe(
      tap((resultat) => {
        const auteur = this.auteurDepuisResultat(cle, req.user, resultat);
        void this.historique.enregistrer(
          {
            ...base,
            ...auteur,
            succes: true,
            codeHttp: res.statusCode,
            details:
              cle === 'POST /auth/register'
                ? { email: typeof body.email === 'string' ? body.email : '' }
                : cle === 'POST /contact'
                  ? {
                      nom:
                        typeof body.nomComplet === 'string'
                          ? body.nomComplet
                          : '',
                    }
                  : undefined,
          },
          {
            cle,
            cible: cibleLibelle,
            body,
            resultat,
            succes: true,
            erreur: null,
          },
        );
      }),
      catchError((error: unknown) => {
        void this.historique.enregistrer(
          {
            ...base,
            utilisateurId: req.user?.id ?? null,
            role: req.user?.role ?? null,
            succes: false,
            codeHttp: error instanceof HttpException ? error.getStatus() : 500,
            details: this.detailsEchec(cle, body, error),
          },
          {
            cle,
            cible: cibleLibelle,
            body,
            resultat: null,
            succes: false,
            erreur: error instanceof Error ? error.message : null,
          },
        );
        return throwError(() => error);
      }),
    );
  }

  private auteurDepuisResultat(
    cle: string,
    user: AuthenticatedUser | undefined,
    resultat: unknown,
  ): Auteur {
    if (user) return { utilisateurId: user.id, role: user.role };

    const objet = (resultat ?? {}) as Record<string, unknown>;
    if (cle === 'POST /auth/login') {
      const connecte = objet.user as { id?: string; role?: Role } | undefined;
      return {
        utilisateurId: connecte?.id ?? null,
        role: connecte?.role ?? null,
      };
    }
    if (cle === 'POST /alertes/reponse-email') {
      return {
        utilisateurId:
          typeof objet.donneurId === 'string' ? objet.donneurId : null,
        role: Role.DONNEUR,
      };
    }
    if (cle === 'POST /auth/register') {
      return { utilisateurId: null, role: Role.DONNEUR };
    }
    return { utilisateurId: null, role: null };
  }

  private detailsEchec(
    cle: string,
    body: Record<string, unknown>,
    error: unknown,
  ): Prisma.InputJsonValue {
    const details: Record<string, string> = {
      erreur: error instanceof Error ? error.message : 'Erreur inconnue',
    };
    if (cle === 'POST /auth/login' && typeof body.identifiant === 'string') {
      details.identifiant = body.identifiant;
    }
    return details;
  }
}
