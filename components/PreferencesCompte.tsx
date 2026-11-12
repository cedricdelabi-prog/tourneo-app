"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from "react";
import { changerLangue, type Langue } from "@/lib/langue";
import { supabase } from "@/lib/supabase";
type Preferences = {
    langue: Langue;
    notifications_sportives: boolean;
    communications_tourneo: boolean;
    texte_agrandi: boolean;
    animations_reduites: boolean;
};
export default function PreferencesCompte() {
    useLangue();
    const [user, setUser] = useState("");
    const [prefs, setPrefs] = useState<Preferences>({ langue: "fr", notifications_sportives: true, communications_tourneo: false, texte_agrandi: false, animations_reduites: false });
    const [message, setMessage] = useState("");
    const [pret, setPret] = useState(false), [occupe, setOccupe] = useState(false);
    useEffect(() => {
        let actif = true;
        void (async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user)
                return;
            const r = await supabase.from("tourneo_preferences").select("langue,notifications_sportives,communications_tourneo,texte_agrandi,animations_reduites").eq("user_id", data.user.id).maybeSingle();
            if (!actif)
                return;
            setUser(data.user.id);
            if (r.error)
                setMessage("Impossible de charger vos préférences. Réessayez.");
            else {
                if (r.data)
                    setPrefs(r.data);
                setPret(true);
            }
        })();
        return () => { actif = false; };
    }, []);
    async function enregistrer() {
        setOccupe(true);
        setMessage("");
        const r = await supabase.from("tourneo_preferences").upsert({ user_id: user, ...prefs }, { onConflict: "user_id" });
        if (r.error)
            setMessage("Enregistrement impossible. Réessayez.");
        else {
            changerLangue(prefs.langue);
            window.dispatchEvent(new Event("tourneo-preferences"));
            setMessage("Préférences enregistrées.");
        }
        setOccupe(false);
    }
    return <section className="v2-card"><h2>{tr("Mes pr\u00E9f\u00E9rences")}</h2><p>{tr("Les notifications apparaissent dans Tourneo. Les e-mails et notifications du t\u00E9l\u00E9phone ne sont pas activ\u00E9s.")}</p><div className="v2-form"><label>{tr("Langue de mon compte")}<select value={prefs.langue} disabled={!pret || occupe} onChange={e => setPrefs(p => ({ ...p, langue: e.target.value as Langue }))}><option value="fr">{tr("Fran\u00E7ais")}</option><option value="en">{tr("English")}</option><option value="nl">{tr("Nederlands")}</option></select></label>
    {([['notifications_sportives', 'Recevoir les informations de mes inscriptions et arbitrages'], ['communications_tourneo', 'J’accepte de recevoir des communications promotionnelles de Tourneo uniquement'], ['texte_agrandi', 'Agrandir les textes'], ['animations_reduites', 'Réduire les animations']] as const).map(([cle, label]) => <label className="v2-check" key={cle}><input type="checkbox" disabled={!pret || occupe} checked={prefs[cle]} onChange={e => setPrefs(p => ({ ...p, [cle]: e.target.checked }))}/>{tr(label)}</label>)}
    <p>{tr("Vous pouvez retirer votre consentement promotionnel \u00E0 tout moment. Ce choix est distinct des informations sportives.")}</p><button type="button" disabled={!pret || occupe} onClick={enregistrer}>{tr("Enregistrer mes pr\u00E9f\u00E9rences")}</button><p role="status">{tr(message)}</p></div></section>;
}
