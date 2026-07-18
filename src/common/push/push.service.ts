import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { RepositoryService } from '../../repository/repository.service';

interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface EnvoiPush {
  title: string;
  body: string;
  url?: string;
  badgeCount?: number;
}

/**
 * Envoi de notifications push (Web Push / VAPID) best-effort : si les clés VAPID ne sont
 * pas configurées, l'envoi est journalisé et ignoré, comme MailService/SmsService — la
 * mobilisation d'un donneur ne doit jamais dépendre de cette configuration optionnelle.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(
    private readonly repository: RepositoryService,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT') ?? 'mailto:contact@cnts.tg';

    this.configured = !!publicKey && !!privateKey;
    if (this.configured) {
      webpush.setVapidDetails(subject, publicKey!, privateKey!);
    }
  }

  estConfigure(): boolean {
    return this.configured;
  }

  getVapidPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  async abonner(donneurId: string, subscription: PushSubscriptionKeys) {
    await this.repository.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, donneurId },
      create: {
        donneurId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return { message: 'Abonnement enregistré' };
  }

  async desabonner(donneurId: string, endpoint: string) {
    await this.repository.pushSubscription.deleteMany({ where: { donneurId, endpoint } });
    return { message: 'Désabonnement effectué' };
  }

  /** Envoie à tous les appareils abonnés d'un donneur ; retire silencieusement les abonnements expirés/invalides (410/404). */
  async envoyerA(donneurId: string, payload: EnvoiPush): Promise<boolean> {
    if (!this.configured) {
      this.logger.warn(`VAPID non configuré : push à "${donneurId}" non envoyé.`);
      return false;
    }

    const abonnements = await this.repository.pushSubscription.findMany({ where: { donneurId } });
    if (abonnements.length === 0) {
      return false;
    }

    const body = JSON.stringify(payload);
    const resultats = await Promise.all(
      abonnements.map(async (abonnement) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: abonnement.endpoint,
              keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
            },
            body,
          );
          return true;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.repository.pushSubscription.deleteMany({ where: { endpoint: abonnement.endpoint } });
          } else {
            this.logger.warn(`Envoi push à "${donneurId}" échoué : ${(error as Error).message}`);
          }
          return false;
        }
      }),
    );

    return resultats.some(Boolean);
  }
}
