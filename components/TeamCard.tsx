import type { Equipe } from "@/types";
import TeamAvatar from "./TeamAvatar";

export default function TeamCard({
  equipe,
  onModifier,
  onSupprimer,
}: {
  equipe: Equipe;
  onModifier: () => void;
  onSupprimer: () => void;
}) {
  return (
    <article style={styles.carte}>
      <TeamAvatar equipe={equipe} taille={52} />

      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 17 }}>{equipe.nom}</strong>

        <div style={{ color: "#94a3b8", fontSize: 13 }}>
          {equipe.photo ? "Photo personnalisée" : `Avatar ${equipe.emoji}`}
        </div>

        {equipe.joueurs && equipe.joueurs.length > 0 && (
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
            {equipe.joueurs.length} joueur(s)
          </div>
        )}
      </div>

      <button style={styles.modifier} onClick={onModifier}>
        Modifier
      </button>

      <button style={styles.supprimer} onClick={onSupprimer}>
        Supprimer
      </button>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  carte: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: 13,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 14,
  },

  modifier: {
    border: 0,
    background: "#1e3a5f",
    color: "#93c5fd",
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
  },

  supprimer: {
    border: 0,
    background: "#3f1d2a",
    color: "#fda4af",
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
  },
};