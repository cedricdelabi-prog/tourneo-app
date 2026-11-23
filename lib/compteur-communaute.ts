export type BorneCommunaute = {
  minimum: number;
  maximum: number;
  mesure: 'comptes_confirmes';
};

/**
 * Respect the privacy-preserving bucket returned by Supabase:
 * a range of confirmed accounts, never visits or an invented count.
 * Do not display "0+" when fewer than ten accounts are confirmed.
 */
export function lireMinimumCommunautaire(inconnu: unknown): number | null {
  if (!inconnu || typeof inconnu !== 'object' || Array.isArray(inconnu)) return null;
  const source = inconnu as Record<string, unknown>;
  const { minimum, maximum, mesure } = source;
  if (mesure !== 'comptes_confirmes'
    || typeof minimum !== 'number' || typeof maximum !== 'number'
    || !Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)
    || minimum < 10) return null;
  const pas = minimum < 100 ? 10 : minimum < 1000 ? 100 : 1000;
  if (minimum % pas !== 0 || maximum !== minimum + pas - 1) return null;
  return minimum;
}
