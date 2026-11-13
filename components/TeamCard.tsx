"use client";
import {tr,trModele,useLangue,localeFormat} from "@/lib/langue";
import type { Equipe } from "@/types";
import TeamAvatar from "./TeamAvatar";
export default function TeamCard({ equipe, onModifier, onSupprimer, suppressionAutorisee = true, }: {
    equipe: Equipe;
    suppressionAutorisee?: boolean;
    onModifier: () => void;
    onSupprimer: () => void;
}) {
    useLangue();
    return (<article className="tourneo-team-card" style={styles.carte}>
      <TeamAvatar equipe={equipe} taille={52}/>

      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 17 }}>{equipe.nom}</strong>

        <div style={{ color: "#94a3b8", fontSize: 13 }}>
          {equipe.photo ? tr("Photo personnalisée") : trModele("Avatar {0}", equipe.emoji)}
        </div>

        {equipe.joueurs && equipe.joueurs.length > 0 && (<div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
            {equipe.joueurs.length}{tr(" joueur(s)")}</div>)}
        {equipe.capitaine&&<p className="tourneo-captain"><span aria-hidden="true">Ⓒ</span> {tr('Capitaine')} : {equipe.capitaine}</p>}
        {!!equipe.historique?.length && <details><summary>{tr("Historique de l\u2019\u00E9quipe")}</summary>{equipe.historique.map((h, i) => <p key={i}>{new Date(h.date).toLocaleString(localeFormat())} · {h.nom}{h.joueurs.length ? trModele(" \u00B7 {0}", h.joueurs.join(', ')) : ''}</p>)}</details>}
      </div>

      <button style={styles.modifier} onClick={onModifier}>{tr("Modifier")}</button>

      <button disabled={!suppressionAutorisee} style={styles.supprimer} onClick={onSupprimer}>{tr("Supprimer")}</button>
    </article>);
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
