const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/** Convertit une durée type "15m" / "7d" en nombre de secondes pour les options JWT. */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Format de durée invalide: "${value}" (attendu ex: 15m, 7d)`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_SECONDS[unit];
}
