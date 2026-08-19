"use client";

import { useEffect, useRef, useState } from "react";
import type { Equipe } from "@/types";

const EMOJIS = ["⚽", "🏀", "🎾", "🏐", "🏓", "🎯", "⭐", "⚡", "👑", "🔥"];
const COULEURS = ["#3B82F6", "#22D3EE", "#7C5CFF", "#16A34A", "#E11D48", "#F59E0B", "#14B8A6", "#F97316"];

export default function TeamModal({
  ouvert,
  equipeAModifier,
  onFermer,
  onAjouter,
}: {
  ouvert: boolean;
  equipeAModifier?: Equipe | null;
  onFermer: () => void;
  onAjouter: (equipe: Equipe) => void;
}) {
  const [nom, setNom] = useState("");
  const [emoji, setEmoji] = useState("⚽");
  const [couleur, setCouleur] = useState("#3B82F6");
  const [photo, setPhoto] = useState("");
  const inputNom = useRef<HTMLInputElement>(null);
  const inputPhoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    setNom(equipeAModifier?.nom ?? "");
    setEmoji(equipeAModifier?.emoji ?? "⚽");
    setCouleur(equipeAModifier?.couleur ?? "#3B82F6");
    setPhoto(equipeAModifier?.photo ?? "");

    const timer = window.setTimeout(() => {
      inputNom.current?.focus();
      inputNom.current?.select();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [ouvert, equipeAModifier]);

  if (!ouvert) return null;

  function lirePhoto(fichier?: File) {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => setPhoto(String(lecteur.result));
    lecteur.readAsDataURL(fichier);
  }

  function enregistrer() {
    const propre = nom.trim();
    if (!propre) {
      inputNom.current?.focus();
      return;
    }

    onAjouter({
      id: equipeAModifier?.id ?? crypto.randomUUID(),
      nom: propre,
      emoji,
      couleur,
      photo: photo || undefined,
      joueurs: equipeAModifier?.joueurs ?? [],
    });
  }

  return (
    <div style={s.backdrop} onMouseDown={(e) => e.currentTarget === e.target && onFermer()}>
      <section style={s.modal} role="dialog" aria-modal="true" aria-label="Participant">
        <header style={s.header}>
          <div>
            <span style={s.eyebrow}>Participant</span>
            <h2 style={s.title}>{equipeAModifier ? "Modifier" : "Ajouter"} un joueur / une équipe</h2>
          </div>
          <button style={s.close} onClick={onFermer} aria-label="Fermer">×</button>
        </header>

        <label style={s.label}>Nom</label>
        <input
          ref={inputNom}
          style={s.input}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. Les Lions ou Cédric"
          onKeyDown={(e) => e.key === "Enter" && enregistrer()}
        />

        <div style={s.two}>
          <div>
            <label style={s.label}>Photo</label>
            <input
              ref={inputPhoto}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => lirePhoto(e.target.files?.[0])}
            />
            <button style={s.secondary} onClick={() => inputPhoto.current?.click()}>
              {photo ? "Changer la photo" : "Choisir une photo"}
            </button>
          </div>
          <div>
            <label style={s.label}>Couleur</label>
            <div style={s.colors}>
              {COULEURS.map((item) => (
                <button
                  key={item}
                  aria-label={item}
                  onClick={() => setCouleur(item)}
                  style={{ ...s.color, background: item, outline: couleur === item ? "3px solid #fff" : "none" }}
                />
              ))}
            </div>
          </div>
        </div>

        {photo ? (
          <img src={photo} alt="Aperçu du participant" style={s.preview} />
        ) : (
          <>
            <label style={s.label}>Avatar rapide</label>
            <div style={s.emojis}>
              {EMOJIS.map((item) => (
                <button
                  key={item}
                  style={{ ...s.emoji, borderColor: emoji === item ? "#72E7FF" : "rgba(148,163,184,.14)" }}
                  onClick={() => setEmoji(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        <button style={s.primary} onClick={enregistrer}>
          {equipeAModifier ? "Enregistrer les modifications" : "Ajouter le participant"}
        </button>
      </section>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center",
    padding: 16, background: "rgba(2,6,23,.82)", backdropFilter: "blur(12px)"
  },
  modal: {
    width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto",
    borderRadius: 26, padding: 22, color: "white",
    border: "1px solid rgba(148,163,184,.18)",
    background: "radial-gradient(circle at 10% 0%,rgba(124,92,255,.20),transparent 34%),#0B1323",
    boxShadow: "0 24px 70px rgba(0,0,0,.46)"
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 14 },
  eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { margin: "6px 0 0", fontSize: 24 },
  close: { width: 40, height: 40, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "rgba(255,255,255,.04)", color: "white", fontSize: 25, cursor: "pointer" },
  label: { display: "block", margin: "18px 0 7px", color: "#B7C2D2", fontWeight: 800, fontSize: 13 },
  input: { width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 14, border: "1px solid rgba(148,163,184,.18)", background: "#07101E", color: "white", fontSize: 17, outline: "none" },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  secondary: { width: "100%", padding: 12, borderRadius: 13, border: "1px solid rgba(114,231,255,.24)", background: "rgba(114,231,255,.06)", color: "#CFF9FF", fontWeight: 800, cursor: "pointer" },
  colors: { display: "flex", flexWrap: "wrap", gap: 8, minHeight: 42, alignItems: "center" },
  color: { width: 30, height: 30, borderRadius: "50%", border: "2px solid #0B1323", cursor: "pointer" },
  preview: { width: 110, height: 110, borderRadius: 24, objectFit: "cover", display: "block", margin: "18px auto 2px", border: "1px solid rgba(148,163,184,.20)" },
  emojis: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 },
  emoji: { minHeight: 46, borderRadius: 12, border: "1px solid rgba(148,163,184,.14)", background: "#07101E", fontSize: 23, cursor: "pointer" },
  primary: { width: "100%", marginTop: 22, padding: 14, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)", color: "white", fontWeight: 900, fontSize: 16, cursor: "pointer" },
};
