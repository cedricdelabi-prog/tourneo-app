"use client";

import { useEffect, useRef, useState } from "react";
import type { Equipe } from "@/types";

const EMOJIS = ["⚽", "🏀", "🎾", "🏐", "🏓", "🦁", "🐯", "🐺", "🦈", "🦅", "🔥", "⚡", "👑", "🚀", "⭐"];
const COULEURS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#7c3aed", "#db2777", "#0891b2", "#ea580c"];

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
  const [couleur, setCouleur] = useState("#2563eb");
  const [photo, setPhoto] = useState("");
  const [joueurs, setJoueurs] = useState<string[]>([]);
  const [nouveauJoueur, setNouveauJoueur] = useState("");
  const inputPhoto = useRef<HTMLInputElement>(null);

  if (!ouvert) return null;

  function lirePhoto(fichier?: File) {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => setPhoto(String(lecteur.result));
    lecteur.readAsDataURL(fichier);
  }

 function ajouterJoueur() {
     const nomJoueur = nouveauJoueur.trim();

  if (!nomJoueur) return;

  setJoueurs([...joueurs, nomJoueur]);
  setNouveauJoueur("");
}
  function ajouter() {  
if (!nom.trim()) {
      alert("Ajoute un nom à l’équipe.");
      return;
    }

    onAjouter({
      id: crypto.randomUUID(),
      nom: nom.trim(),
      emoji,
      couleur,
      photo: photo || undefined,
      joueurs,
    });

    setNom("");
    setEmoji("⚽");
    setCouleur("#2563eb");
    setPhoto("");
    setJoueurs([]);
setNouveauJoueur("");
    onFermer();
  }

  return (
    <div style={styles.fond}>
      <section style={styles.modal}>
        <div style={styles.entete}>
         <h2 style={{ margin: 0 }}>Nouveau participant</h2>
          <button style={styles.fermer} onClick={onFermer}>×</button>
        </div>

        <label style={styles.label}>Nom de l'équipe ou du joueur</label>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
         placeholder="Ex : Les Lions ou Cédric"
          style={styles.champ}
        />

        <label style={styles.label}>Photo de l’équipe</label>
        <input
          ref={inputPhoto}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => lirePhoto(e.target.files?.[0])}
        />
        <button style={styles.photoBouton} onClick={() => inputPhoto.current?.click()}>
          📷 {photo ? "Changer la photo" : "Prendre ou choisir une photo"}
        </button>

        {photo && (
          <img
            src={photo}
            alt="Aperçu"
            style={styles.apercu}
          />
        )}

        <p style={styles.ou}>ou choisis un emoji</p>

        <div style={styles.grille}>
          {EMOJIS.map((item) => (
            <button
              key={item}
              onClick={() => {
                setEmoji(item);
                setPhoto("");
              }}
              style={{
                ...styles.emoji,
                outline: emoji === item && !photo ? "3px solid #60a5fa" : "none",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <label style={styles.label}>Couleur</label>
        <div style={styles.couleurs}>
          {COULEURS.map((item) => (
            <button
              key={item}
              onClick={() => setCouleur(item)}
              style={{
                ...styles.couleur,
                background: item,
                outline: couleur === item ? "3px solid white" : "none",
              }}
            />
          ))}
        </div>

        <button style={styles.principal} onClick={ajouter}>
          Ajouter l’équipe
        </button>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fond: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,.78)",
    display: "grid",
    placeItems: "center",
    padding: 18,
    zIndex: 100,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 22,
    padding: 22,
    color: "white",
  },
  entete: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fermer: {
    border: 0,
    background: "#334155",
    color: "white",
    borderRadius: 10,
    width: 38,
    height: 38,
    fontSize: 24,
    cursor: "pointer",
  },
  label: {
    display: "block",
    margin: "20px 0 8px",
    fontWeight: 800,
  },
  champ: {
    width: "100%",
    padding: 13,
    borderRadius: 11,
    border: "1px solid #64748b",
    fontSize: 16,
  },
  photoBouton: {
    width: "100%",
    padding: 13,
    borderRadius: 11,
    border: "1px dashed #60a5fa",
    background: "#172554",
    color: "#bfdbfe",
    fontWeight: 800,
    cursor: "pointer",
  },
  apercu: {
    width: 100,
    height: 100,
    display: "block",
    objectFit: "cover",
    borderRadius: "50%",
    margin: "14px auto",
  },
  ou: { textAlign: "center", color: "#94a3b8" },
  grille: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
  },
  emoji: {
    minHeight: 48,
    border: 0,
    borderRadius: 11,
    background: "#0f172a",
    fontSize: 24,
    cursor: "pointer",
  },
  couleurs: { display: "flex", flexWrap: "wrap", gap: 10 },
  couleur: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "2px solid #1e293b",
    cursor: "pointer",
  },
  principal: {
    width: "100%",
    marginTop: 24,
    padding: 14,
    border: 0,
    borderRadius: 12,
    background: "#2563eb",
    color: "white",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
  },
};
