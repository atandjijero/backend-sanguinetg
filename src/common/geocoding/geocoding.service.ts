import { Injectable, Logger } from '@nestjs/common';

interface Coordonnees {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  importance?: number;
}

/**
 * Géocodage best-effort via Nominatim (OpenStreetMap), borné à Lomé/Togo.
 * Échec silencieux (retourne null) : les coordonnées restent alors éditables manuellement.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocoderLome(requete: string): Promise<Coordonnees | null> {
    const query = `${requete}, Lomé, Togo`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tg&q=${encodeURIComponent(query)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SanguineTG-CNTS-Lome/1.0 (memoire-cnts-togo)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const results = (await response.json()) as NominatimResult[];
      const premier = results[0];
      if (!premier) {
        return null;
      }

      const latitude = Number(premier.lat);
      const longitude = Number(premier.lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      this.logger.warn(`Géocodage échoué pour "${requete}": ${(error as Error).message}`);
      return null;
    }
  }
}
