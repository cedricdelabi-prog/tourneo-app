import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

const Config = registerPlugin<{ pushConfig(): Promise<{ configured: boolean; project: string }> }>('TourneoNativeConfig');
const CLE = 'tourneo-v2-android-installation';
const ACCORD = 'tourneo-v2-android-compte';
let ecoute: Promise<PluginListenerHandle[]> | null = null;
let attente: { resolve: (token: string) => void; reject: (e: Error) => void } | null = null;
let enregistrement = false;

export const estAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export function installationAndroid() {
  let id = localStorage.getItem(CLE);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { id = crypto.randomUUID(); localStorage.setItem(CLE, id); }
  return id;
}
export async function configAndroid() {
  if (!estAndroid() || !Capacitor.isPluginAvailable('TourneoNativeConfig')) return null;
  try { return await Config.pushConfig(); } catch { return null; }
}
export function lienNotificationAndroid(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value, window.location.origin);
    if (u.origin !== window.location.origin || u.search) return null;
    return (u.pathname === '/activite' && !u.hash) || (/^\/partage\/[^/]+$/.test(u.pathname) && /^#match-\d+$/.test(u.hash)) ? u.pathname + u.hash : null;
  } catch { return null; }
}
async function sauvegarder(token: string, userId: string) {
  const r = await supabase.rpc('tourneo_android_inscrire', { p_installation: installationAndroid(), p_jeton: token, p_compte: userId });
  if (r.error) throw r.error;
}
async function ecouter() {
  if (ecoute) return ecoute;
  ecoute = (async () => {
    const handles: PluginListenerHandle[] = [];
    try {
      handles.push(await PushNotifications.addListener('registration', ({ value }) => {
        if (attente) { attente.resolve(value); return; }
        void (async () => {
          const accord = localStorage.getItem(ACCORD);
          if (!accord) return;
          const { data } = await supabase.auth.getUser();
          if (data.user?.id !== accord) return;
          const p = await supabase.from('tourneo_preferences').select('notifications_android,notifications_sportives').eq('user_id', accord).maybeSingle();
          if (!p.error && p.data?.notifications_android && p.data.notifications_sportives && localStorage.getItem(ACCORD) === accord) await sauvegarder(value, accord);
        })().catch(() => { /* A later launch retries token refresh without changing consent. */ });
      }));
      handles.push(await PushNotifications.addListener('registrationError', () => attente?.reject(new Error('Activation impossible. Vérifiez la connexion et réessayez.'))));
      handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const lien = lienNotificationAndroid(notification.data?.url);
        if (lien) window.location.assign(lien);
      }));
      return handles;
    } catch (e) { await Promise.all(handles.map(h => h.remove())); ecoute = null; throw e; }
  })();
  return ecoute;
}
async function jeton() {
  if (attente) throw new Error('Activation déjà en cours.');
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { attente = null; reject(new Error('Activation impossible. Vérifiez la connexion et réessayez.')); }, 15000);
    attente = { resolve: value => { clearTimeout(timer); attente = null; resolve(value); }, reject: e => { clearTimeout(timer); attente = null; reject(e); } };
    void PushNotifications.register().catch(() => attente?.reject(new Error('Activation impossible. Vérifiez la connexion et réessayez.')));
  });
}
export async function activerAndroid(userId: string) {
  if (enregistrement) throw new Error('Activation déjà en cours.');
  enregistrement = true;
  try {
    const [native, serveur] = await Promise.all([configAndroid(), supabase.rpc('tourneo_config_alertes')]);
    if (!native?.configured || !serveur.data?.android || native.project !== serveur.data.android_projet) throw new Error('Les notifications Android ne sont pas encore configurées.');
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') throw new Error('Autorisation non accordée. Vérifiez les réglages du navigateur.');
    await ecouter();
    await PushNotifications.createChannel({ id: 'tourneo_matchs', name: 'Tourneo', importance: 4, visibility: 0 });
    const token = await jeton();
    await sauvegarder(token, userId);
    localStorage.setItem(ACCORD, userId);
  } catch (e) {
    localStorage.removeItem(ACCORD);
    await PushNotifications.unregister().catch(() => {});
    throw e;
  } finally { enregistrement = false; }
}
export async function desactiverAndroid() {
  localStorage.removeItem(ACCORD);
  if (!estAndroid()) return;
  const id = localStorage.getItem(CLE);
  let erreur: unknown;
  try {
    if (id) { const r = await supabase.rpc('tourneo_android_retirer', { p_installation: id }); if (r.error) throw r.error; }
  } catch (e) { erreur = e; }
  // Revoke the token locally even when the network is unavailable.
  const native = await configAndroid();
  if (native?.configured) await PushNotifications.unregister().catch(() => {});
  if (erreur) throw erreur;
}
export async function reprendreAndroid() {
  const native = await configAndroid();
  if (!native?.configured) return;
  await ecouter();
  const accord = localStorage.getItem(ACCORD);
  if (!accord) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.id !== accord) { await desactiverAndroid().catch(() => {}); return; }
  const p = await supabase.from('tourneo_preferences').select('notifications_android,notifications_sportives').eq('user_id', accord).maybeSingle();
  if (p.error) return;
  if (!p.data?.notifications_android || !p.data.notifications_sportives) { await desactiverAndroid().catch(() => {}); return; }
  if ((await PushNotifications.checkPermissions()).receive === 'granted') await PushNotifications.register();
}
