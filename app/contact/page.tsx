"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import TourneoNav from "@/components/TourneoNav";

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
    if (!message.trim()) { setRetour("Décrivez votre demande avant d’envoyer."); return; }
    if (!contactEmail) { setRetour("Configurez NEXT_PUBLIC_CONTACT_EMAIL dans Vercel pour activer l’envoi."); return; }
    const corps = [`Catégorie : ${categorie}`, `Nom : ${nom || "Non renseigné"}`, `Email : ${email || "Non renseigné"}`, "", message.trim()].join("\n");
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <TourneoNav active="contact" showBack backHref="/dashboard" primaryLabel="Créer un tournoi" primaryHref="/tournoi/nouveau" />
        <header style={s.hero}>
          <span style={s.eyebrow}>Contactez-nous</span>
          <h1 style={s.title}>Une idée, un bug ou une demande ?</h1>
          <p style={s.muted}>Vous pouvez nous écrire pour une amélioration, un problème technique, un club ou même une demande publicitaire.</p>
        </header>
        <section style={s.grid}>
          <article style={s.card}>
            <span style={s.eyebrow}>Type de demande</span>
            <div style={s.chips}>
              {CATEGORIES.map((item) => (
                <button key={item} style={{ ...s.chip, ...(categorie === item ? s.chipActive : {}) }} onClick={() => setCategorie(item)}>{item}</button>
              ))}
            </div>
          </article>
          <article style={s.card}>
            <div style={s.row}>
              <span style={s.eyebrow}>Votre message</span>
              <button style={s.link} onClick={preRemplirCompte}>Utiliser mon compte</button>
            </div>
            <label style={s.label}>Nom / pseudo</label>
            <input style={s.input} value={nom} onChange={(e) => setNom(e.target.value)} />
            <label style={s.label}>E-mail</label>
            <input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            <label style={s.label}>Message</label>
            <textarea style={s.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Expliquez-nous votre demande…" />
            <button style={s.primary} onClick={envoyer}>Préparer l’e-mail</button>
            {retour && <p style={s.feedback}>{retour}</p>}
          </article>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "22px 18px 90px", background: "radial-gradient(circle at 15% 7%,rgba(124,92,255,.17),transparent 28%),linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1000, margin: "0 auto" },
  hero: { marginBottom: 20 },
  eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { margin: "7px 0", fontSize: "clamp(36px,6vw,62px)", lineHeight: 1.02 },
  muted: { color: "#8799B0", lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 },
  card: { minWidth: 0, padding: 22, borderRadius: 24, background: "rgba(15,25,43,.78)", border: "1px solid rgba(148,163,184,.14)", overflow: "hidden" },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { padding: "10px 12px", borderRadius: 999, border: "1px solid rgba(148,163,184,.14)", background: "rgba(255,255,255,.035)", color: "#98A8BC", cursor: "pointer" },
  chipActive: { color: "white", borderColor: "rgba(114,231,255,.28)", background: "linear-gradient(135deg,rgba(124,92,255,.28),rgba(34,211,238,.10))" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  link: { border: 0, background: "transparent", color: "#72E7FF", fontWeight: 800, cursor: "pointer" },
  label: { display: "block", margin: "13px 0 6px", color: "#B7C2D2", fontSize: 13, fontWeight: 800 },
  input: { width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "#07101E", color: "white" },
  textarea: { width: "100%", boxSizing: "border-box", minHeight: 150, resize: "vertical", padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "#07101E", color: "white", fontFamily: "inherit" },
  primary: { width: "100%", marginTop: 14, padding: 14, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)", color: "white", fontWeight: 900, cursor: "pointer" },
  feedback: { color: "#A7EFFF", fontSize: 13 },
};
