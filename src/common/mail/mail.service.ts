import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EnvoiEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 10_000;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | null;
  private readonly fromEmail: string;
  private readonly fromName: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') ?? null;
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') ?? 'no-reply@sanguine-tg.local';
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME');
  }

  async envoyer({ to, subject, text, html }: EnvoiEmail): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(
        `BREVO_API_KEY non configurée : email à "${to}" ("${subject}") non envoyé.`,
      );
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: this.fromEmail, name: this.fromName },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`${response.status} ${response.statusText} : ${detail}`);
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Envoi d'email à "${to}" échoué : ${(error as Error).message}`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
