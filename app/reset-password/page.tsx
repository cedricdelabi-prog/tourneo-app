"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState } from "react";
import ChampMotDePasse from "@/components/ChampMotDePasse";
import { supabase } from "@/lib/supabase";
export default function ResetPasswordPage() {
    useLangue();
    const [motDePasse, setMotDePasse] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [message, setMessage] = useState("");
    const [chargement, setChargement] = useState(false);
    const [lienValide, setLienValide] = useState(false);
    const verrou = useRef(false);
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setLienValide(true);
            }
        });
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setLienValide(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    async function modifierMotDePasse() {
        if (verrou.current)
            return;
        setMessage("");
        if (motDePasse.length < 6) {
            setMessage("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }
        if (motDePasse !== confirmation) {
            setMessage("Les deux mots de passe ne correspondent pas.");
            return;
        }
        verrou.current = true;
        setChargement(true);
        setMessage("Modification de votre mot de passe en cours…");
        let redirection = false;
        try {
            const { error } = await supabase.auth.updateUser({ password: motDePasse });
            if (error) {
                setMessage(error.message);
                return;
            }
            redirection = true;
            setMessage("Mot de passe modifié. Retour à la connexion…");
            window.setTimeout(() => { window.location.href = "/login"; }, 1500);
        }
        catch {
            setMessage("La modification n’a pas abouti. Vérifiez votre connexion et réessayez.");
        }
        finally {
            if (!redirection) {
                verrou.current = false;
                setChargement(false);
            }
        }
    }
    return (<main style={styles.page}>
      <section style={styles.carte}>
        <div style={styles.logo}>🏆</div>
        <h1 style={styles.titre}>{tr("Nouveau mot de passe")}</h1>

        {!lienValide ? (<p style={styles.message}>{tr("Ouvre cette page depuis le lien re\u00E7u par e-mail.")}</p>) : (<>
            <label htmlFor="reset-password" style={styles.label}>{tr("Nouveau mot de passe")}</label>

            <ChampMotDePasse id="reset-password" disabled={chargement} autoComplete="new-password" value={motDePasse} onChange={(event) => setMotDePasse(event.target.value)} placeholder={tr("6 caractères minimum")} style={styles.input}/>

            <label htmlFor="reset-confirmation" style={styles.label}>{tr("Confirmer le mot de passe")}</label>

            <ChampMotDePasse id="reset-confirmation" disabled={chargement} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={tr("Confirme ton mot de passe")} style={styles.input}/>

            <button onClick={modifierMotDePasse} disabled={chargement} style={styles.bouton}>
              {chargement
                ? tr("Modification...") : tr("Modifier mon mot de passe")}
            </button>
          </>)}

        <div role="status" aria-live="polite" aria-atomic="true">{tr(message) && <p style={styles.message}>{tr(message)}</p>}</div>

        <button style={styles.retour} onClick={() => (window.location.href = "/login")}>{tr("Retour \u00E0 la connexion")}</button>
      </section>
    </main>);
}
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "linear-gradient(145deg,#07101f,#0f172a 45%,#111c33)",
        color: "white",
        fontFamily: "Arial,sans-serif",
    },
    carte: {
        width: "100%",
        maxWidth: 410,
        padding: 28,
        borderRadius: 22,
        background: "#1e293b",
        border: "1px solid #334155",
    },
    logo: {
        textAlign: "center",
        fontSize: 48,
    },
    titre: {
        textAlign: "center",
        marginBottom: 24,
    },
    label: {
        display: "block",
        margin: "16px 0 8px",
        fontWeight: 800,
    },
    input: {
        width: "100%",
        padding: 14,
        borderRadius: 11,
        border: "1px solid #64748b",
        fontSize: 16,
    },
    bouton: {
        width: "100%",
        marginTop: 22,
        padding: 14,
        border: 0,
        borderRadius: 11,
        background: "#2563eb",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
    },
    retour: {
        width: "100%",
        marginTop: 14,
        padding: 12,
        border: "none",
        background: "transparent",
        color: "#93c5fd",
        cursor: "pointer",
    },
    message: {
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        background: "#0f172a",
        color: "#bfdbfe",
        textAlign: "center",
    },
};
