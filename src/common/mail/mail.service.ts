import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EnvoiEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoi d'email best-effort via SMTP (Brevo). Si MAIL_HOST/MAIL_USER/SMTP_PASSWORD ne
 * sont pas configurés, l'envoi est simplement journalisé et ignoré : la fonctionnalité
 * qui déclenche l'email (réponse à un message de contact, alerte) doit rester utilisable
 * même sans configuration SMTP.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const port = this.configService.get<number>('MAIL_PORT') ?? 587;
    const secure = this.configService.get<string>('MAIL_SECURE') === 'true';
    const fromEmail = this.configService.get<string>('MAIL_FROM') ?? user ?? 'no-reply@sanguine-tg.local';
    const fromName = this.configService.get<string>('MAIL_FROM_NAME');
    this.from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

    if (!host || !user || !password) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      // Un serveur SMTP qui traîne ne doit pas bloquer indéfiniment la création d'une
      // alerte (envoyée à N donneurs en parallèle) : on abandonne après 10s.
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }

  async envoyer({ to, subject, text, html }: EnvoiEmail): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP non configuré : email à "${to}" ("${subject}") non envoyé.`);
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (error) {
      this.logger.warn(`Envoi d'email à "${to}" échoué : ${(error as Error).message}`);
      return false;
    }
  }
}
