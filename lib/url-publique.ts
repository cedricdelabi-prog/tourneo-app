// Use the public host for the database selected by this deployment.
export const ORIGINE_PUBLIQUE_V2 = process.env.NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED === 'true'
  ? 'https://tourneo-app.vercel.app'
  : 'https://tourneo-v2-test.vercel.app';

export function urlPubliqueTournoi(id: string, usage: 'inscriptions' | 'partage' | 't' = 'partage') {
  return `${ORIGINE_PUBLIQUE_V2}/${usage}/${encodeURIComponent(id)}`;
}
