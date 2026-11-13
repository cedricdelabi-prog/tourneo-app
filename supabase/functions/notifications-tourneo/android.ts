// FCM HTTP v1. Only the worker reads the service account; never expose it to clients.
export type CompteFirebase = { project_id: string; client_email: string; private_key: string };
export function lireCompteFirebase(value: string | undefined): CompteFirebase | null {
  try {
    if (!value) return null;
    const c = JSON.parse(value);
    if (!/^[a-z][a-z0-9-]{4,62}$/.test(c.project_id) || typeof c.client_email !== 'string' || !c.client_email.endsWith('.iam.gserviceaccount.com') || !c.private_key?.startsWith('-----BEGIN PRIVATE KEY-----')) return null;
    return { project_id: c.project_id, client_email: c.client_email, private_key: c.private_key };
  } catch { return null; }
}
const b64 = (bytes: Uint8Array) => btoa(Array.from(bytes, x => String.fromCharCode(x)).join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const encode = (v: unknown) => b64(new TextEncoder().encode(JSON.stringify(v)));
export function creerTransportAndroid(compte: CompteFirebase, requete: typeof fetch = fetch) {
  let cache: { token: string; fin: number } | undefined;
  let attente: Promise<string> | undefined;
  async function obtenirJeton() {
    if (cache && cache.fin > Date.now() + 60000) return cache.token;
    if (attente) return attente;
    attente = (async () => {
      const texte = compte.private_key.replace(/-----[^-]+-----|\s/g, '');
      const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(texte), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      const iat = Math.floor(Date.now() / 1000);
      const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: compte.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })}`;
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(payload));
      const r = await requete('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: payload + '.' + b64(new Uint8Array(signature)) }), signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('Authentification Android indisponible');
      const json = await r.json();
      if (typeof json.access_token !== 'string' || !json.access_token || !Number.isFinite(json.expires_in) || json.expires_in <= 0) throw new Error('Réponse Android invalide');
      cache = { token: json.access_token, fin: Date.now() + Math.min(json.expires_in, 3600) * 1000 };
      return cache.token;
    })();
    try { return await attente; } finally { attente = undefined; }
  }
  return async (jeton: string, body: string, lien: string, id: string): Promise<number> => {
    const r = await requete(`https://fcm.googleapis.com/v1/projects/${compte.project_id}/messages:send`, { method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${await obtenirJeton()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { token: jeton, notification: { title: 'Tourneo', body }, data: { url: lien }, android: { priority: 'high', ttl: '300s', collapse_key: id, notification: { channel_id: 'tourneo_matchs', tag: id } } } }), signal: AbortSignal.timeout(10000) });
    if (r.status === 401) cache = undefined;
    if (r.status === 404) {
      const json = await r.json().catch(() => ({}));
      return json.error?.details?.some((x: Record<string, string>) => x['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && x.errorCode === 'UNREGISTERED') ? 410 : 500;
    }
    return r.status;
  };
}
