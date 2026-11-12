"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
export default function TourneoBrand({ compact = false }: {
    compact?: boolean;
    showName?: boolean;
}) {
    useLangue();
    return <img src="/tourneo-officiel.png" alt={tr("Tourneo — Créez. Jouez. Gagnez.")} width={192} height={192} style={{ width: compact ? 120 : 160, maxWidth: "100%", height: "auto", display: "block", objectFit: "contain", borderRadius: 24, flexShrink: 0 }}/>;
}
