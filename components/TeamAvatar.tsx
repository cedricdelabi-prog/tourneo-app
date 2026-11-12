"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import PhotoPrivee from "@/components/PhotoPrivee";
import type { Equipe } from "@/types";
export default function TeamAvatar({ equipe, taille = 44, }: {
    equipe: Equipe;
    taille?: number;
}) {
    useLangue();
    if (equipe.photo) {
        return (<PhotoPrivee src={equipe.photo} alt={equipe.nom} style={{
                width: taille,
                height: taille,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${equipe.couleur}`,
            }}/>);
    }
    return (<div style={{
            width: taille,
            height: taille,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: equipe.couleur,
            fontSize: taille * 0.48,
            flexShrink: 0,
        }}>
      {equipe.emoji}
    </div>);
}
