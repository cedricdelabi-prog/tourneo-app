import { classementEpreuve, classementOlympiade, type Olympiade } from '@/lib/olympiades';
export default function ClassementOlympiade({ donnees }: {
    donnees: Olympiade;
}) {
    const valides = donnees.epreuves.filter(e => e.validee).length;
    return <section className="v2-card"><span className="v2-eyebrow">Olympiades</span><h2>Classement général</h2><p>{valides} épreuve(s) validée(s) sur {donnees.epreuves.length}. Chaque épreuve a le même poids : {donnees.equipes.length} points au premier, puis un point de moins par place. Les ex æquo gagnent autant de points.</p>{!valides ? <p>Validez une première épreuve pour lancer le classement.</p> : <ol className="tourneo-olympic-ranking">{classementOlympiade(donnees).map(l => <li key={l.equipe.id}><strong><span>{l.rang}</span>{l.equipe.nom}</strong><b>{l.points} pts</b></li>)}</ol>}{donnees.epreuves.filter(e => e.validee).map(e => <details className="tourneo-olympic-results" key={e.id}><summary>{e.nom} · résultats validés</summary>{classementEpreuve(e, donnees.equipes).map(l => <p key={l.equipe.id}>{l.rang}. {l.equipe.nom} · {l.valeur} {e.unite} · {l.points} pts</p>)}</details>)}</section>;
}
