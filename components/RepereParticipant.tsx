"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import type { RepereAppel } from '@/lib/reperes-appel';
export default function RepereParticipant({ id, reperes }: {
    id: string;
    reperes: RepereAppel[];
}) {
    useLangue();
    const ids = id.startsWith('duo:') ? id.slice(4).split('|') : [id];
    const joueurs = reperes.filter(r => ids.includes(r.id));
    return <span className="tourneo-inline-markers">{joueurs.map(r => <span key={r.id} className={`tourneo-player-marker is-${r.statut}`} title={tr("Un profil lié ne confirme pas la réception d’une alerte.")}>{joueurs.length > 1 ? trModele("{0} \u00B7 ", r.nom) : ''}{r.statut === 'profil' ? tr('Profil lié') : r.statut === 'sur_place' ? tr('Sans profil lié') : tr('Non vérifié')}</span>)}</span>;
}
