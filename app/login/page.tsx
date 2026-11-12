"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import ChampMotDePasse from "@/components/ChampMotDePasse";
import TourneoBrand from "@/components/TourneoBrand";
export default function LoginPage() {
    useLangue();
    const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [prenom, setPrenom] = useState("");
    const [nom, setNom] = useState("");
    const [pseudo, setPseudo] = useState("");
    const [ville, setVille] = useState("");
    const [message, setMessage] = useState("");
    const [chargement, setChargement] = useState(false);
    const [googleDisponible, setGoogleDisponible] = useState(false);
    const [action, setAction] = useState<"connexion" | "inscription" | "google" | "reset" | null>(null);
    const [etatMessage, setEtatMessage] = useState<"info" | "succes" | "erreur">("info");
    const verrou = useRef(false);
    const messageRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (message)
        messageRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [message]);
    useEffect(() => {
        const controleur = new AbortController();
        const delai = setTimeout(() => controleur.abort(), 5000);
        void fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
            headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
            signal: controleur.signal,
        }).then(async (r) => {
            if (!r.ok)
                return;
            const settings = await r.json();
            if (!controleur.signal.aborted)
                setGoogleDisponible(settings.external?.google === true);
        }).catch(() => { }).finally(() => clearTimeout(delai));
        return () => { clearTimeout(delai); controleur.abort(); };
    }, []);
    function notifier(texte: string, etat: "info" | "succes" | "erreur" = "info") {
        setMessage(texte);
        setEtatMessage(etat);
    }
    function commencer(action: "connexion" | "inscription" | "google" | "reset", texte: string) {
        if (verrou.current)
            return false;
        verrou.current = true;
        setAction(action);
        setChargement(true);
        notifier(texte);
        return true;
    }
    function terminer() { verrou.current = false; setAction(null); setChargement(false); }
    function erreurLisible(erreur: unknown) {
        const texte = erreur instanceof Error ? erreur.message : "";
        if (/invalid login credentials/i.test(texte))
            return "E-mail ou mot de passe incorrect.";
        if (/email not confirmed/i.test(texte))
            return "Confirmez votre adresse e-mail avant de vous connecter.";
        if (/rate limit|too many requests/i.test(texte))
            return "Trop de tentatives. Réessayez dans quelques instants.";
        return texte || "La demande n’a pas abouti. Vérifiez votre connexion et réessayez.";
    }
    async function connexionGoogle() {
        if (!commencer("google", "Redirection vers Google…"))
            return;
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
            if (error)
                throw error;
        }
        catch (error) {
            notifier(erreurLisible(error), "erreur");
            terminer();
        }
    }
    async function envoyer() {
        if (verrou.current)
            return;
        if (!email.trim() || !password) {
            notifier("Renseignez votre e-mail et votre mot de passe.", "erreur");
            return;
        }
        if (password.length < 6) {
            notifier("Le mot de passe doit contenir au moins 6 caractères.", "erreur");
            return;
        }
        if (mode === "inscription" && (!prenom.trim() || !nom.trim())) {
            notifier("Renseignez votre prénom et votre nom.", "erreur");
            return;
        }
        if (!commencer(mode, mode === "inscription" ? "Création de votre compte en cours…" : "Connexion en cours…"))
            return;
        let redirection = false;
        try {
            if (mode === "inscription") {
                const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
                    options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: {
                            first_name: prenom.trim(), last_name: nom.trim(), display_name: pseudo.trim() || `${prenom.trim()} ${nom.trim()}`, city: ville.trim(),
                        } },
                });
                if (error)
                    throw error;
                if (data.session) {
                    redirection = true;
                    notifier("Compte créé. Ouverture de votre espace…", "succes");
                    window.location.href = "/dashboard";
                }
                else
                    notifier("Demande prise en compte. Consultez vos e-mails pour confirmer votre adresse, puis connectez-vous.", "succes");
            }
            else {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error)
                    throw error;
                redirection = true;
                notifier("Connexion réussie. Ouverture de votre espace…", "succes");
                window.location.href = "/dashboard";
            }
        }
        catch (error) {
            notifier(erreurLisible(error), "erreur");
        }
        finally {
            if (!redirection)
                terminer();
        }
    }
    async function motDePasseOublie() {
        if (verrou.current)
            return;
        if (!email.trim()) {
            notifier("Saisissez d’abord votre adresse e-mail.", "erreur");
            return;
        }
        if (!commencer("reset", "Envoi du lien de réinitialisation en cours…"))
            return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
            if (error)
                throw error;
            notifier("Demande prise en compte. Si un compte correspond à cette adresse, consultez vos e-mails pour réinitialiser le mot de passe.", "succes");
        }
        catch (error) {
            notifier(erreurLisible(error), "erreur");
        }
        finally {
            terminer();
        }
    }
    return (<main style={s.page}>
      <div style={s.glow1}/>
      <div style={s.glow2}/>

      <section style={s.card}>
        <div style={s.brandCenter}>
          <TourneoBrand />
        </div>

        <div style={s.switcher}>
          <button style={{
            ...s.switch,
            ...(mode === "connexion" ? s.switchActive : {}),
        }} onClick={() => { setMode("connexion"); notifier(""); }} aria-pressed={mode === "connexion"} disabled={chargement}>{tr("Connexion")}</button>

          <button style={{
            ...s.switch,
            ...(mode === "inscription" ? s.switchActive : {}),
        }} onClick={() => { setMode("inscription"); notifier(""); }} aria-pressed={mode === "inscription"} disabled={chargement}>{tr("Cr\u00E9er un compte")}</button>
        </div>

        {googleDisponible && <><button style={{
                ...s.google,
                ...(chargement ? { opacity: 0.65, cursor: "wait" } : {}),
            }} onClick={connexionGoogle} disabled={chargement}>
          <span style={s.googleMark}>G</span>
          {action === "google" ? tr("Redirection vers Google…") : tr("Continuer avec Google")}
        </button>

        <div style={s.separator}>
          <span>{tr("ou")}</span>
        </div></>}

        <form aria-busy={chargement} onSubmit={e => { e.preventDefault(); void envoyer(); }}>
        <fieldset disabled={chargement} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {mode === "inscription" && (<>
            <div style={s.two}>
              <div>
                <label htmlFor="auth-first-name" style={s.label}>{tr("Pr\u00E9nom")}</label>
                <input style={s.input} id="auth-first-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name"/>
              </div>

              <div>
                <label htmlFor="auth-last-name" style={s.label}>{tr("Nom")}</label>
                <input style={s.input} id="auth-last-name" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name"/>
              </div>
            </div>

            <label style={s.label}>{tr("Pseudo Tourneo ")}<span style={s.optional}>{tr("facultatif")}</span>
            </label>
            <input style={s.input} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder={tr("Ex. Cedric62")}/>

            <label style={s.label}>{tr("Ville ")}<span style={s.optional}>{tr("facultatif")}</span>
            </label>
            <input style={s.input} value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder={tr("Ex. Calais")}/>
          </>)}

        <label htmlFor="auth-email" style={s.label}>E-mail</label>
        <input style={s.input} type="email" id="auth-email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={tr("vous@email.fr")}/>

        <label htmlFor="auth-password" style={s.label}>{tr("Mot de passe")}</label>
        <ChampMotDePasse key={mode} id="auth-password" style={s.input} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "connexion" ? "current-password" : "new-password"} placeholder={tr("6 caractères minimum")}/>

        <button style={s.primary} type="submit" disabled={chargement}>
          {(action === "connexion" || action === "inscription") && <span className="auth-spinner" aria-hidden="true"/>}
          {action === "connexion" || action === "inscription"
            ? action === "inscription" ? tr("Création du compte…") : tr("Connexion en cours…")
            : mode === "connexion"
                ? tr("Se connecter") : tr("Créer mon compte")}
        </button>

        {mode === "connexion" && (<button type="button" style={s.link} onClick={motDePasseOublie}>
            {action === "reset" ? tr("Envoi du lien…") : tr("Mot de passe oublié ?")}
          </button>)}

        </fieldset>
        </form>
        <div ref={messageRef} role={etatMessage === "erreur" ? "alert" : "status"} aria-live={etatMessage === "erreur" ? "assertive" : "polite"} aria-atomic="true">
          {tr(message) && <div style={{ ...s.message, ...(etatMessage === "succes" ? { background: "rgba(34,197,94,.12)", borderColor: "#22c55e", color: "#bbf7d0" } : etatMessage === "erreur" ? { background: "rgba(239,68,68,.12)", borderColor: "#ef4444", color: "#fecaca" } : {}) }}>{etatMessage === "succes" ? "✓ " : etatMessage === "erreur" ? "! " : ""}{tr(message)}</div>}
        </div>
        <style jsx>{`
          button:not(:disabled):active { filter: brightness(.88); }
          button:disabled { cursor: wait !important; opacity: .65; }
          button:focus-visible { outline: 2px solid #72e7ff; outline-offset: 3px; }
          .auth-spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; vertical-align: middle; animation: auth-spin .8s linear infinite; }
          @keyframes auth-spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) { .auth-spinner { animation: none; } }
        `}</style>

        <p style={s.legal}>{tr("En cr\u00E9ant un compte, vous acceptez le fonctionnement et les r\u00E8gles de s\u00E9curit\u00E9 pr\u00E9sent\u00E9s dans la rubrique Aide & s\u00E9curit\u00E9.")}</p>
      </section>
    </main>);
}
const s: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "linear-gradient(145deg,#050811,#0B1220)",
        color: "white",
        fontFamily: "Inter,system-ui,sans-serif",
    },
    glow1: {
        position: "fixed",
        width: 500,
        height: 500,
        left: "-10%",
        top: "-15%",
        borderRadius: "50%",
        background: "rgba(124,92,255,.17)",
        filter: "blur(80px)",
    },
    glow2: {
        position: "fixed",
        width: 420,
        height: 420,
        right: "-12%",
        bottom: "-15%",
        borderRadius: "50%",
        background: "rgba(34,211,238,.10)",
        filter: "blur(80px)",
    },
    card: {
        position: "relative",
        width: "100%",
        maxWidth: 480,
        padding: 26,
        borderRadius: 28,
        border: "1px solid rgba(148,163,184,.16)",
        background: "rgba(11,19,35,.88)",
        backdropFilter: "blur(18px)",
        boxShadow: "0 30px 80px rgba(0,0,0,.38)",
    },
    brandCenter: {
        display: "flex",
        justifyContent: "center",
        marginBottom: 20,
    },
    switcher: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        padding: 5,
        borderRadius: 16,
        background: "#07101E",
        marginBottom: 14,
    },
    switch: {
        padding: 11,
        border: 0,
        borderRadius: 12,
        background: "transparent",
        color: "#8293A9",
        fontWeight: 900,
        cursor: "pointer",
    },
    switchActive: {
        background: "rgba(124,92,255,.18)",
        color: "white",
    },
    google: {
        width: "100%",
        padding: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,.18)",
        background: "white",
        color: "#111827",
        fontWeight: 900,
        cursor: "pointer",
    },
    googleMark: {
        width: 24,
        height: 24,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color: "#2563EB",
        fontWeight: 1000,
    },
    separator: {
        display: "grid",
        placeItems: "center",
        margin: "14px 0",
        color: "#65758C",
        fontSize: 12,
    },
    two: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
    },
    label: {
        display: "block",
        margin: "12px 0 6px",
        color: "#B7C2D2",
        fontSize: 13,
        fontWeight: 800,
    },
    optional: {
        color: "#65758C",
        fontWeight: 700,
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: 13,
        borderRadius: 13,
        border: "1px solid rgba(148,163,184,.18)",
        background: "#07101E",
        color: "white",
        fontSize: 16,
        outline: "none",
    },
    primary: {
        width: "100%",
        marginTop: 18,
        padding: 14,
        border: 0,
        borderRadius: 14,
        background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",
        color: "white",
        fontSize: 16,
        fontWeight: 900,
        cursor: "pointer",
    },
    link: {
        width: "100%",
        marginTop: 12,
        border: 0,
        background: "transparent",
        color: "#72E7FF",
        cursor: "pointer",
        fontWeight: 800,
    },
    message: {
        marginTop: 14,
        padding: 12,
        borderRadius: 13,
        background: "rgba(59,130,246,.10)",
        border: "1px solid rgba(59,130,246,.18)",
        color: "#CFEAFF",
        fontSize: 13,
        lineHeight: 1.5,
    },
    legal: {
        color: "#65758C",
        fontSize: 11,
        lineHeight: 1.5,
        textAlign: "center",
        margin: "16px 0 0",
    },
};
