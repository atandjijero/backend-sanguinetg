import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EnvoiSms {
  to: string;
  content: string;
}

const INDICATIF_TOGO = '228';

/**
 * Envoi de SMS best-effort via l'API transactionnelle Brevo. Si BREVO_API_KEY /
 * BREVO_SMS_SENDER ne sont pas configurés, l'envoi est journalisé et ignoré : la
 * fonctionnalité qui déclenche le SMS (ex. alerte don de sang) doit rester utilisable
 * même sans configuration Brevo.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey?: string;
  private readonly sender?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.sender = this.configService.get<string>('SMS_SENDER');
  }

  async envoyer({ to, content }: EnvoiSms): Promise<boolean> {
    if (!this.apiKey || !this.sender) {
      this.logger.warn(`Brevo SMS non configuré : SMS à "${to}" non envoyé.`);
      return false;
    }

    const recipient = this.normaliserNumeroTogolais(to);
    if (!recipient) {
      this.logger.warn(`Numéro de téléphone invalide pour l'envoi SMS : "${to}".`);
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          recipient,
          content,
          type: 'transactional',
        }),
      });

      if (!response.ok) {
        const corps = await response.text();
        this.logger.warn(`Envoi SMS à "${to}" échoué (${response.status}) : ${corps}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Envoi SMS à "${to}" échoué : ${(error as Error).message}`);
      return false;
    }
  }

  private normaliserNumeroTogolais(telephone: string): string | null {
    const chiffres = telephone.replace(/\D/g, '');
    if (chiffres.length === 8) {
      return INDICATIF_TOGO + chiffres;
    }
    if (chiffres.length === 11 && chiffres.startsWith(INDICATIF_TOGO)) {
      return chiffres;
    }
    return null;
  }
}
