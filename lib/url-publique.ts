// Use the public host for the database selected by this deployment.
// Keep the established production and test URLs until the new domain has
// passed public DNS, HTTPS and authentication checks. Enable the official
// domain only by setting NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN in production.
const ORIGINE_PRODUCTION_V2 = process.env.NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN === 'https://www.tourneo.org'
  ? 'https://www.tourneo.org'
  : 'https://tourneo-app.vercel.app';

export const ORIGINE_PUBLIQUE_V2 = process.env.NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED === 'true'
  ? ORIGINE_PRODUCTION_V2
  : 'https://tourneo-v2-test.vercel.app';

export const HOTE_PUBLIC_V2 = new URL(ORIGINE_PUBLIQUE_V2).host;

export function urlPubliqueTournoi(id: string, usage: 'inscriptions' | 'partage' | 't' = 'partage') {
  return `${ORIGINE_PUBLIQUE_V2}/${usage}/${encodeURIComponent(id)}`;
}
