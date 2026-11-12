"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { classementEpreuve, classementOlympiade, type Olympiade } from '@/lib/olympiades';
export default function ClassementOlympiade({ donnees }: {
    donnees: Olympiade;
}) {
    useLangue();
    const valides = donnees.epreuves.filter(e => e.validee).length;
    return <section className="v2-card"><span className="v2-eyebrow">{tr("Olympiades")}</span><h2>{tr("Classement g\u00E9n\u00E9ral")}</h2><p>{valides}{tr(" \u00E9preuve(s) valid\u00E9e(s) sur ")}{donnees.epreuves.length}{tr(". Chaque \u00E9preuve a le m\u00EAme poids : ")}{donnees.equipes.length}{tr(" points au premier, puis un point de moins par place. Les ex \u00E6quo gagnent autant de points.")}</p>{!valides ? <p>{tr("Validez une premi\u00E8re \u00E9preuve pour lancer le classement.")}</p> : <ol className="tourneo-olympic-ranking">{classementOlympiade(donnees).map(l => <li key={l.equipe.id}><strong><span>{l.rang}</span>{l.equipe.nom}</strong><b>{l.points}{tr(" pts")}</b></li>)}</ol>}{donnees.epreuves.filter(e => e.validee).map(e => <details className="tourneo-olympic-results" key={e.id}><summary>{e.nom}{tr(" \u00B7 r\u00E9sultats valid\u00E9s")}</summary>{classementEpreuve(e, donnees.equipes).map(l => <p key={l.equipe.id}>{l.rang}. {l.equipe.nom} · {l.valeur} {e.unite} · {l.points}{tr(" pts")}</p>)}</details>)}</section>;
}
