import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache best-effort via Redis, sur le même principe que MailService/PushService : si
 * REDIS_URL n'est pas configuré (ou que Redis est indisponible), get() ne trouve jamais
 * rien et set() est ignoré silencieusement — aucune fonctionnalité ne doit dépendre de
 * la présence de Redis, seulement en bénéficier en performance quand il est disponible.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) {
      this.client = null;
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.client.on('error', (error: Error) =>
      this.logger.warn(`Erreur Redis : ${error.message}`),
    );
    this.client
      .connect()
      .catch((error: Error) =>
        this.logger.warn(`Connexion Redis impossible : ${error.message}`),
      );
  }

  async get<T>(cle: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const valeur = await this.client.get(cle);
      return valeur ? (JSON.parse(valeur) as T) : null;
    } catch (error) {
      this.logger.warn(
        `Lecture cache "${cle}" échouée : ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set(cle: string, valeur: unknown, ttlSecondes: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(cle, JSON.stringify(valeur), 'EX', ttlSecondes);
    } catch (error) {
      this.logger.warn(
        `Écriture cache "${cle}" échouée : ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
