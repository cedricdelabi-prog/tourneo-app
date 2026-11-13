"use client";
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { tr, useLangue } from '@/lib/langue';
import { activerAndroid, configAndroid, desactiverAndroid, installationAndroid } from '@/lib/android-push';

export default function AlertesAndroid() {
  useLangue();
  const [etat, setEtat] = useState({ user: '', actif: false, pret: false, disponible: false, sport: true });
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  const verrou = useRef(false);
  useEffect(() => {
    let present = true, generation = 0;
    async function charger() {
      const version = ++generation;
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const [native, cfg, p, d] = await Promise.all([
          configAndroid(), supabase.rpc('tourneo_config_alertes'),
          supabase.from('tourneo_preferences').select('notifications_android,notifications_sportives').eq('user_id', data.user.id).maybeSingle(),
          supabase.from('tourneo_android_appareils').select('id').eq('user_id', data.user.id).eq('installation_id', installationAndroid()).maybeSingle(),
        ]);
        if (!present || version !== generation) return;
        if (cfg.error || p.error || d.error) throw new Error();
        setEtat({ user: data.user.id, actif: Boolean(d.data) && p.data?.notifications_android === true, pret: true, disponible: Boolean(native?.configured && cfg.data?.android && native.project === cfg.data.android_projet), sport: p.data?.notifications_sportives !== false });
      } catch { if (present && version === generation) setMessage('Impossible de charger vos alertes. Rechargez la page.'); }
    }
    void charger(); window.addEventListener('tourneo-preferences', charger);
    return () => { present = false; generation++; window.removeEventListener('tourneo-preferences', charger); };
  }, []);
  async function changer() {
    if (verrou.current || !etat.pret) return;
    verrou.current = true; setOccupe(true);
    try {
      if (etat.actif) await desactiverAndroid(); else await activerAndroid(etat.user);
      setEtat(e => ({ ...e, actif: !e.actif }));
      setMessage(etat.actif ? 'Alertes désactivées sur cet appareil.' : 'Appareil enregistré. Vérifiez aussi les réglages de votre téléphone.');
    } catch { setMessage('Activation impossible. Vérifiez la connexion et réessayez.'); }
    finally { verrou.current = false; setOccupe(false); }
  }
  return <div className="v2-entry">
    <h3>{tr('Notifications Android')}</h3>
    <p>{tr(etat.actif ? 'Cet appareil est enregistré.' : 'Cet appareil n’est pas encore enregistré.')}</p>
    <button type="button" disabled={!etat.pret || occupe || (!etat.actif && (!etat.disponible || !etat.sport))} onClick={() => void changer()}>{tr(etat.actif ? 'Désactiver cet appareil' : 'Activer sur cet appareil')}</button>
    {etat.pret && !etat.disponible && <p>{tr('Les notifications Android ne sont pas encore configurées.')}</p>}
    {!etat.sport && <p>{tr('Activez d’abord les informations sportives dans vos préférences.')}</p>}
    {message && <p role="status">{tr(message)}</p>}
  </div>;
}
