import type { RepereAppel } from '@/lib/reperes-appel';
export default function RepereParticipant({ id, reperes }: { id: string; reperes: RepereAppel[] }) {
  const ids = id.startsWith('duo:') ? id.slice(4).split('|') : [id];
  const joueurs = reperes.filter(r => ids.includes(r.id));
  return <span className="tourneo-inline-markers">{joueurs.map(r => <span key={r.id} className={`tourneo-player-marker is-${r.statut}`} title="Un profil lié ne confirme pas la réception d’une alerte.">{joueurs.length > 1 ? `${r.nom} · ` : ''}{r.statut === 'profil' ? 'Profil lié' : r.statut === 'sur_place' ? 'Sans profil lié' : 'Non vérifié'}</span>)}</span>;
}
