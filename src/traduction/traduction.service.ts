import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DeepLResponse {
  translations: { text: string }[];
}

/**
 * Traduction via l'API DeepL, avec un cache en mémoire pour éviter de retraduire (et
 * refacturer) un texte déjà rencontré depuis le démarrage du serveur. Le frontend reste
 * seul responsable de la langue active et de l'affichage : ce service ne fait que relayer
 * l'appel à DeepL, qui nécessite une clé secrète non exposable au navigateur.
 */
@Injectable()
export class TraductionService {
  private readonly logger = new Logger(TraductionService.name);
  private readonly apiKey?: string;
  private readonly cache = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPL_API_KEY');
  }

  async traduire(textes: string[], langueCible: 'EN' | 'FR'): Promise<string[]> {
    // Le contenu source du site est déjà en français : rien à faire pour revenir au français.
    if (langueCible === 'FR') {
      return textes;
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException("La traduction n'est pas configurée (DEEPL_API_KEY manquante).");
    }

    const resultats = new Array<string>(textes.length);
    const aTraduire: { index: number; texte: string }[] = [];

    textes.forEach((texte, index) => {
      const enCache = this.cache.get(this.cleCache(texte, langueCible));
      if (enCache !== undefined) {
        resultats[index] = enCache;
      } else {
        aTraduire.push({ index, texte });
      }
    });

    if (aTraduire.length > 0) {
      const traductions = await this.appellerDeepL(
        aTraduire.map((entree) => entree.texte),
        langueCible,
      );
      aTraduire.forEach((entree, i) => {
        const traduit = traductions[i] ?? entree.texte;
        this.cache.set(this.cleCache(entree.texte, langueCible), traduit);
        resultats[entree.index] = traduit;
      });
    }

    return resultats;
  }

  private cleCache(texte: string, langueCible: string) {
    return `${langueCible}:${texte}`;
  }

  private async appellerDeepL(textes: string[], langueCible: 'EN' | 'FR'): Promise<string[]> {
    const url = this.apiKey!.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textes, source_lang: 'FR', target_lang: langueCible }),
      });
    } catch (error) {
      this.logger.warn(`Appel DeepL échoué : ${(error as Error).message}`);
      throw new InternalServerErrorException('Traduction indisponible pour le moment.');
    }

    if (!response.ok) {
      const corps = await response.text();
      this.logger.warn(`Appel DeepL échoué (${response.status}) : ${corps}`);
      throw new InternalServerErrorException('Traduction indisponible pour le moment.');
    }

    const data = (await response.json()) as DeepLResponse;
    return data.translations.map((traduction) => traduction.text);
  }
}
