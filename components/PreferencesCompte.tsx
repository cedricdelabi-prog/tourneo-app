"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Preferences = { notifications_sportives: boolean; communications_tourneo: boolean; texte_agrandi: boolean; animations_reduites: boolean };
export default function PreferencesCompte() {
  const [user, setUser] = useState("");
  const [prefs, setPrefs] = useState<Preferences>({ notifications_sportives: true, communications_tourneo: false, texte_agrandi: false, animations_reduites: false });
  const [message, setMessage] = useState("");
  const [pret, setPret] = useState(false), [occupe, setOccupe] = useState(false);
  useEffect(() => { let actif = true; void (async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const r = await supabase.from("tourneo_preferences").select("notifications_sportives,communications_tourneo,texte_agrandi,animations_reduites").eq("user_id", data.user.id).maybeSingle();
    if (!actif) return;
    setUser(data.user.id);
    if (r.error) setMessage("Impossible de charger vos préférences. Réessayez.");
    else { if (r.data) setPrefs(r.data); setPret(true); }
  })(); return () => { actif = false; }; }, []);
  async function enregistrer() {
    setOccupe(true); setMessage("");
    const r = await supabase.from("tourneo_preferences").upsert({ user_id: user, ...prefs }, { onConflict: "user_id" });
    if (r.error) setMessage("Enregistrement impossible. Réessayez.");
    else { window.dispatchEvent(new Event("tourneo-preferences")); setMessage("Préférences enregistrées."); }
    setOccupe(false);
  }
  return <section className="v2-card"><h2>Mes préférences</h2><p>Les notifications apparaissent dans Tourneo. Les e-mails et notifications du téléphone ne sont pas activés.</p><div className="v2-form">
    {([['notifications_sportives', 'Recevoir les informations de mes inscriptions et arbitrages'], ['communications_tourneo', 'J’accepte de recevoir des communications promotionnelles de Tourneo uniquement'], ['texte_agrandi', 'Agrandir les textes'], ['animations_reduites', 'Réduire les animations']] as const).map(([cle, label]) => <label className="v2-check" key={cle}><input type="checkbox" disabled={!pret || occupe} checked={prefs[cle]} onChange={e => setPrefs(p => ({ ...p, [cle]: e.target.checked }))}/>{label}</label>)}
    <p>Vous pouvez retirer votre consentement promotionnel à tout moment. Ce choix est distinct des informations sportives.</p><button type="button" disabled={!pret || occupe} onClick={enregistrer}>Enregistrer mes préférences</button><p role="status">{message}</p></div></section>;
}
