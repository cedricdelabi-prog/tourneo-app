// Public V2 links must never point at a Vercel branch preview protected by SSO.
export const ORIGINE_PUBLIQUE_V2='https://tourneo-v2-test.vercel.app';
export function urlPubliqueTournoi(id:string,usage:'inscriptions'|'partage'='partage'){return `${ORIGINE_PUBLIQUE_V2}/${usage}/${encodeURIComponent(id)}`;}
