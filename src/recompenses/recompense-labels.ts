import { TypeRecompense } from '@prisma/client';

export const TYPE_RECOMPENSE_LABELS: Record<TypeRecompense, string> = {
  BADGE: 'Badge',
  CERTIFICAT: 'Certificat',
  VIVRES: 'Vivres',
  TRANSPORT: 'Transport',
  AUTRE: 'Autre',
};
