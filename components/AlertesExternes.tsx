"use client";

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { clePush } from '@/lib/push-client';
import { tr, useLangue } from '@/lib/langue';

type Config = { push?: boolean; cle?: string; email?: boolean };

export default function AlertesExternes() {
  useLangue();
  const [user, setUser] = useState('');
  const [config, setConfig] = useState<Config>({});
  const [actif, setActif] = useState(false);
  const [email, setEmail] = useState(false);
  const [sport, setSport] = useState(true);
  const [compatible, setCompatible] = useState(false);
  const [pret, setPret] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  const verrou = useRef(false);

  useEffect(() => {
    let present = true;
    let generation = 0;
    async function charger() {
      const version = ++generation;
      try {
        const a = await supabase.auth.getUser();
        if (!a.data.user) return;
        const [cfg, prefs] = await Promise.all([
          supabase.rpc('tourneo_config_alertes'),
          supabase.from('tourneo_preferences').select('notifications_push,notifications_email,notifications_sportives').eq('user_id', a.data.user.id).maybeSingle(),
        ]);
        if (!present || version !== generation) return;
        if (cfg.error || prefs.error) throw new Error();
        const support = !Capacitor.isNativePlatform() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        let inscrit = false;
        if (support) {
          const reg = await navigator.serviceWorker.getRegistration('/');
          const subscription = await reg?.pushManager.getSubscription();
          if (subscription) {
            const r = await supabase.from('tourneo_push_abonnements').select('id').eq('endpoint', subscription.endpoint).maybeSingle();
            if (r.error) throw r.error;
            inscrit = Boolean(r.data);
          }
        }
        if (!present || version !== generation) return;
        setUser(a.data.user.id);
        setConfig(cfg.data || {});
        setEmail(prefs.data?.notifications_email === true);
        setSport(prefs.data?.notifications_sportives !== false);
        setCompatible(support);
        setActif(inscrit && prefs.data?.notifications_push === true);
        setPret(true);
      } catch {
        if (present && version === generation) {
          setPret(false);
          setMessage('Impossible de charger vos alertes. Rechargez la page.');
        }
      }
    }
    void charger();
    window.addEventListener('tourneo-preferences', charger);
    return () => { present = false; generation++; window.removeEventListener('tourneo-preferences', charger); };
  }, []);

  async function appareil() {
    if (verrou.current || !pret) return;
    verrou.current = true;
    setOccupe(true);
    let nouvelle: PushSubscription | null = null;
    try {
      if (actif) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const subscription = await reg?.pushManager.getSubscription();
        if (subscription) {
          const r = await supabase.from('tourneo_push_abonnements').delete().eq('user_id', user).eq('endpoint', subscription.endpoint);
          if (r.error) throw r.error;
          await subscription.unsubscribe();
        }
        setActif(false);
        setMessage('Alertes désactivées sur cet appareil.');
        return;
      }
      if (!compatible || !config.cle || !sport) throw new Error();
      if (await Notification.requestPermission() !== 'granted') {
        setMessage('Autorisation non accordée. Vérifiez les réglages du navigateur.');
        return;
      }
      await navigator.serviceWorker.register('/sw-v2.js', { scope: '/' });
      const reg = await navigator.serviceWorker.ready;
      const ancienne = await reg.pushManager.getSubscription();
      const subscription = ancienne || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clePush(config.cle) });
      if (!ancienne) nouvelle = subscription;
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) throw new Error();
      const existe = await supabase.from('tourneo_push_abonnements').select('id').eq('endpoint', subscription.endpoint).maybeSingle();
      if (existe.error) throw existe.error;
      if (!existe.data) {
        const r = await supabase.from('tourneo_push_abonnements').insert({ user_id: user, endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
        if (r.error) throw r.error;
      }
      const r = await supabase.from('tourneo_preferences').upsert({ user_id: user, notifications_push: true }, { onConflict: 'user_id' });
      if (r.error) throw r.error;
      setActif(true);
      setMessage('Appareil enregistré. Vérifiez aussi les réglages de votre téléphone.');
    } catch {
      if (nouvelle) {
        await nouvelle.unsubscribe().catch(() => false);
        await supabase.from('tourneo_push_abonnements').delete().eq('user_id', user).eq('endpoint', nouvelle.endpoint);
      }
      setMessage('Activation impossible. Vérifiez la connexion et réessayez.');
    } finally { verrou.current = false; setOccupe(false); }
  }

  async function changerEmail() {
    if (verrou.current || !pret) return;
    verrou.current = true;
    setOccupe(true);
    try {
      const r = await supabase.from('tourneo_preferences').upsert({ user_id: user, notifications_email: !email }, { onConflict: 'user_id' });
      if (r.error) throw r.error;
      setEmail(v => !v);
      setMessage('Préférence enregistrée.');
    } catch { setMessage('Préférence non enregistrée. Réessayez.'); }
    finally { verrou.current = false; setOccupe(false); }
  }

  return <section className="v2-card">
    <h2>{tr('Alertes sur mes appareils')}</h2>
    <p>{tr('Recevez les informations de vos tournois. Ces choix sont distincts des communications promotionnelles.')}</p>
    <div className="v2-entry">
      <h3>{tr('Notifications du téléphone')}</h3>
      <p>{tr(actif ? 'Cet appareil est enregistré.' : compatible ? 'Cet appareil n’est pas encore enregistré.' : 'Pour les alertes quand Tourneo est fermé, utilisez la version web. Sur iPhone, ajoutez-la à l’écran d’accueil.')}</p>
      <button type="button" disabled={!pret || occupe || (!actif && (!compatible || !config.push || !sport))} onClick={() => void appareil()}>{tr(actif ? 'Désactiver cet appareil' : 'Activer sur cet appareil')}</button>
      {!sport && <p>{tr('Activez d’abord les informations sportives dans vos préférences.')}</p>}
    </div>
    <div className="v2-entry">
      <h3>{tr('Alertes sportives par e-mail')}</h3>
      <button type="button" disabled={!pret || occupe || (!email && (!config.email || !sport))} onClick={() => void changerEmail()}>{tr(email ? 'Désactiver les e-mails sportifs' : 'Activer les e-mails sportifs')}</button>
      {pret && !config.email && <p>{tr('L’envoi par e-mail n’est pas disponible actuellement.')}</p>}
    </div>
    {message && <p role="status">{tr(message)}</p>}
    <p>{tr('Une transmission ne confirme pas la réception ni la lecture.')}</p>
  </section>;
}
