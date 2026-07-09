import { Injectable } from '@nestjs/common';
import { TypeAlerteSecurite } from '@prisma/client';

const MOTIFS_SQL_INJECTION: RegExp[] = [
  /\b(union|select|insert|update|delete|drop|alter)\b\s+\b(select|from|table|into|database)\b/i,
  // ' OR 1=1 / ' OR '1'='1 / ' OR "1"="1" : comparaison tautologique, valeurs éventuellement quotées
  /('|")\s*(or|and)\s*('|")?\d+('|")?\s*=\s*('|")?\d+('|")?/i,
  /;\s*(drop|delete|update|insert)\b/i,
  /--\s*['")]/,
];

const MOTIFS_XSS: RegExp[] = [
  /<script[\s>]/i,
  /javascript:/i,
  /on(error|load|click|mouseover|focus)\s*=/i,
  /<iframe[\s>]/i,
  /<img[^>]+onerror/i,
];

export interface DetectionResult {
  type: TypeAlerteSecurite;
  extrait: string;
}

@Injectable()
export class ThreatDetectionService {
  detecterDansTexte(valeur: string): DetectionResult | null {
    for (const motif of MOTIFS_SQL_INJECTION) {
      if (motif.test(valeur)) {
        return { type: 'SQL_INJECTION', extrait: valeur.slice(0, 200) };
      }
    }
    for (const motif of MOTIFS_XSS) {
      if (motif.test(valeur)) {
        return { type: 'XSS_ATTEMPT', extrait: valeur.slice(0, 200) };
      }
    }
    return null;
  }

  detecterDansObjet(valeur: unknown, profondeur = 0): DetectionResult | null {
    if (profondeur > 5 || valeur == null) return null;

    if (typeof valeur === 'string') {
      return this.detecterDansTexte(valeur);
    }

    if (Array.isArray(valeur)) {
      for (const item of valeur) {
        const resultat = this.detecterDansObjet(item, profondeur + 1);
        if (resultat) return resultat;
      }
      return null;
    }

    if (typeof valeur === 'object') {
      for (const cle of Object.keys(valeur as Record<string, unknown>)) {
        const resultat = this.detecterDansObjet((valeur as Record<string, unknown>)[cle], profondeur + 1);
        if (resultat) return resultat;
      }
    }

    return null;
  }
}
