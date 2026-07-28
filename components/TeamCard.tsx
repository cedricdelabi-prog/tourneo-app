import type { Equipe } from "@/types";
import TeamAvatar from "./TeamAvatar";

export default function TeamCard({
  equipe,
  onSupprimer,
}: {
  equipe: Equipe;
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
      </div>
      <button style={styles.supprimer} onClick={onSupprimer}>Supprimer</button>
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
  supprimer: {
    border: 0,
    background: "#3f1d2a",
    color: "#fda4af",
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
  },
};
