"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import TourneoBrand from "@/components/TourneoBrand";

export default function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [ville, setVille] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function connexionGoogle() {
    setMessage("La connexion Google sera disponible prochainement.");
  }

  async function envoyer() {
    setMessage("");
    if (!email || !password) {
      setMessage("Renseignez votre e-mail et votre mot de passe.");
      return;
    }
    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setChargement(true);
    try {
      if (mode === "inscription") {
        if (!prenom.trim() || !nom.trim()) {
          setMessage("Prénom et nom sont nécessaires pour créer votre profil Tourneo.");
          return;
        }

        const displayName = pseudo.trim() || `${prenom.trim()} ${nom.trim()}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              first_name: prenom.trim(),
              last_name: nom.trim(),
              display_name: displayName,
              city: ville.trim(),
            },
          },
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Compte créé. Un e-mail Tourneo vous attend pour confirmer votre adresse.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          console.error("Erreur connexion Supabase :", error);
          setMessage(error.message || "Impossible de vous connecter.");
        } else {
          window.location.href = "/dashboard";
        }
      }
    } finally {
      setChargement(false);
    }
  }

  async function motDePasseOublie() {
    if (!email) {
      setMessage("Saisissez d’abord votre adresse e-mail.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessage(error ? error.message : "Un e-mail de réinitialisation vient d’être envoyé.");
  }

  return (
    <main style={s.page}>
      <div style={s.glow1} />
      <div style={s.glow2} />
      <section style={s.card}>
        <div style={s.brandCenter}><TourneoBrand /></div>
        <div style={s.switcher}>
          <button style={{ ...s.switch, ...(mode === "connexion" ? s.switchActive : {}) }} onClick={() => setMode("connexion")}>Connexion</button>
          <button style={{ ...s.switch, ...(mode === "inscription" ? s.switchActive : {}) }} onClick={() => setMode("inscription")}>Créer un compte</button>
        </div>

        <button
          style={{ ...s.google, opacity: .55, cursor: "not-allowed" }}
          onClick={connexionGoogle}
          disabled
          aria-disabled="true"
        >
          <span style={s.googleMark}>G</span>
          Google bientôt disponible
        </button>

        <div style={s.separator}><span>ou</span></div>

        {mode === "inscription" && (
          <>
            <div style={s.two}>
              <div>
                <label style={s.label}>Prénom</label>
                <input style={s.input} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
              </div>
              <div>
                <label style={s.label}>Nom</label>
                <input style={s.input} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" />
              </div>
            </div>

            <label style={s.label}>Pseudo Tourneo <span style={s.optional}>facultatif</span></label>
            <input style={s.input} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ex. Cedric62" />

            <label style={s.label}>Ville <span style={s.optional}>facultatif</span></label>
            <input style={s.input} value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder="Ex. Calais" />
          </>
        )}

        <label style={s.label}>E-mail</label>
        <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="vous@email.fr" />

        <label style={s.label}>Mot de passe</label>
        <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "connexion" ? "current-password" : "new-password"} placeholder="6 caractères minimum" />

        <button style={s.primary} onClick={envoyer} disabled={chargement}>
          {chargement ? "Chargement…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
        </button>

        {mode === "connexion" && <button style={s.link} onClick={motDePasseOublie}>Mot de passe oublié ?</button>}
        {message && <div style={s.message}>{message}</div>}

        <p style={s.legal}>En créant un compte, vous acceptez le fonctionnement et les règles de sécurité présentés dans la rubrique Aide & sécurité.</p>
      </section>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", padding: 18, background: "linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  glow1: { position: "fixed", width: 500, height: 500, left: "-10%", top: "-15%", borderRadius: "50%", background: "rgba(124,92,255,.17)", filter: "blur(80px)" },
  glow2: { position: "fixed", width: 420, height: 420, right: "-12%", bottom: "-15%", borderRadius: "50%", background: "rgba(34,211,238,.10)", filter: "blur(80px)" },
  card: { position: "relative", width: "100%", maxWidth: 480, padding: 26, borderRadius: 28, border: "1px solid rgba(148,163,184,.16)", background: "rgba(11,19,35,.88)", backdropFilter: "blur(18px)", boxShadow: "0 30px 80px rgba(0,0,0,.38)" },
  brandCenter: { display: "flex", justifyContent: "center", marginBottom: 20 },
  switcher: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 5, borderRadius: 16, background: "#07101E", marginBottom: 14 },
  switch: { padding: 11, border: 0, borderRadius: 12, background: "transparent", color: "#8293A9", fontWeight: 900, cursor: "pointer" },
  switchActive: { background: "rgba(124,92,255,.18)", color: "white" },
  google: { width: "100%", padding: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, border: "1px solid rgba(148,163,184,.18)", background: "white", color: "#111827", fontWeight: 900, cursor: "pointer" },
  googleMark: { width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", color: "#2563EB", fontWeight: 1000 },
  separator: { display: "grid", placeItems: "center", margin: "14px 0", color: "#65758C", fontSize: 12 },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { display: "block", margin: "12px 0 6px", color: "#B7C2D2", fontSize: 13, fontWeight: 800 },
  optional: { color: "#65758C", fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.18)", background: "#07101E", color: "white", fontSize: 16, outline: "none" },
  primary: { width: "100%", marginTop: 18, padding: 14, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" },
  link: { width: "100%", marginTop: 12, border: 0, background: "transparent", color: "#72E7FF", cursor: "pointer", fontWeight: 800 },
  message: { marginTop: 14, padding: 12, borderRadius: 13, background: "rgba(59,130,246,.10)", border: "1px solid rgba(59,130,246,.18)", color: "#CFEAFF", fontSize: 13, lineHeight: 1.5 },
  legal: { color: "#65758C", fontSize: 11, lineHeight: 1.5, textAlign: "center", margin: "16px 0 0" },
};
