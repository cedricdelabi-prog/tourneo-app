"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Signaler un problème",
  "Proposer une amélioration",
  "Publicité / partenariat",
  "Club / association",
  "Autre demande",
];

export default function ContactPage() {
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [retour, setRetour] = useState("");

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
  const sujet = useMemo(() => `Tourneo - ${categorie}`, [categorie]);

  async function preRemplirCompte() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    setEmail(user.email || "");
    const { data: profil } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (profil?.display_name) setNom(profil.display_name);
  }

  async function envoyer() {
    if (!message.trim()) {
      setRetour("Décrivez votre demande avant d’envoyer.");
      return;
    }
    if (!contactEmail) {
      setRetour("L’adresse de contact doit encore être configurée dans NEXT_PUBLIC_CONTACT_EMAIL.");
      return;
    }

    const corps = [
      `Catégorie : ${categorie}`,
      `Nom : ${nom || "Non renseigné"}`,
      `Email : ${email || "Non renseigné"}`,
      "",
      message.trim(),
    ].join("\n");

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <span style={s.eyebrow}>Contactez-nous</span>
            <h1 style={s.title}>Une idée ? Un bug ? Une opportunité ?</h1>
            <p style={s.muted}>Tourneo doit évoluer avec les usages réels. Dites-nous ce qu’il faut améliorer.</p>
          </div>
          <button style={s.ghost} onClick={() => history.back()}>Retour</button>
        </header>

        <section style={s.grid}>
          <article style={s.card}>
            <span style={s.eyebrow}>Type de demande</span>
            <div style={s.chips}>
              {CATEGORIES.map((item) => (
                <button key={item} style={{ ...s.chip, ...(categorie === item ? s.chipActive : {}) }} onClick={() => setCategorie(item)}>
                  {item}
                </button>
              ))}
            </div>
            <p style={s.help}>Pour la publicité, vous pourrez utiliser cette rubrique plus tard si une marque souhaite acheter un emplacement directement dans Tourneo.</p>
          </article>

          <article style={s.card}>
            <div style={s.rowBetween}>
              <span style={s.eyebrow}>Vos coordonnées</span>
              <button style={s.linkButton} onClick={preRemplirCompte}>Utiliser mon compte</button>
            </div>
            <label style={s.label}>Nom / pseudo</label>
            <input style={s.input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" />
            <label style={s.label}>Email</label>
            <input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" />
            <label style={s.label}>Votre message</label>
            <textarea style={s.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Expliquez votre idée, votre problème ou votre demande…" />
            <button style={s.primary} onClick={envoyer}>Préparer l’email</button>
            {retour && <p style={s.feedback}>{retour}</p>}
          </article>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "28px 18px", background: "radial-gradient(circle at 16% 8%,rgba(124,92,255,.18),transparent 27%),radial-gradient(circle at 82% 12%,rgba(34,211,238,.08),transparent 25%),linear-gradient(145deg,#070a12,#0b1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1000, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 20 },
  title: { fontSize: "clamp(34px,5vw,58px)", margin: "8px 0" },
  eyebrow: { color: "#72e7ff", fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" },
  muted: { color: "#8398b2" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 },
  card: { padding: 22, borderRadius: 24, background: "rgba(15,25,43,.80)", border: "1px solid rgba(148,163,184,.12)", display: "grid", gap: 10 },
  chips: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  chip: { padding: "10px 12px", borderRadius: 999, border: "1px solid rgba(148,163,184,.12)", background: "rgba(255,255,255,.03)", color: "#9eb2ca", cursor: "pointer" },
  chipActive: { color: "white", background: "linear-gradient(135deg,rgba(124,92,255,.30),rgba(59,130,246,.20))", borderColor: "rgba(114,231,255,.25)" },
  help: { color: "#8498af", fontSize: 13, lineHeight: 1.55 },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  linkButton: { border: 0, background: "transparent", color: "#72e7ff", cursor: "pointer", fontWeight: 800 },
  label: { color: "#9db1c8", fontSize: 12, fontWeight: 800, marginTop: 4 },
  input: { padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "#0a1322", color: "white" },
  textarea: { minHeight: 150, resize: "vertical", padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "#0a1322", color: "white", fontFamily: "inherit" },
  primary: { padding: 13, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)", color: "white", fontWeight: 900, cursor: "pointer" },
  ghost: { padding: "11px 14px", borderRadius: 13, border: "1px solid rgba(148,163,184,.14)", background: "rgba(255,255,255,.03)", color: "white", cursor: "pointer" },
  feedback: { color: "#9fb2c8", fontSize: 13 },
};
