import type { Equipe, Match } from '@/types';
import { matchTermine } from '@/lib/formats-avances';
export type FormatParcours = 'doubleElimination' | 'consolante';
function vainqueur(m: Match) { return Number(m.score1) > Number(m.score2) ? m.equipe1Id : m.equipe2Id; }
function perdant(m: Match) { return vainqueur(m) === m.equipe1Id ? m.equipe2Id : m.equipe1Id; }
export function defaitesParcours(equipes: Equipe[], matchs: Match[]) {
  const pertes = new Map(equipes.map(e => [e.id, 0]));
  for (const m of matchs) if (matchTermine(m) && m.score1 !== m.score2) pertes.set(perdant(m), (pertes.get(perdant(m)) ?? 0) + 1);
  return pertes;
}
function creerTour(groupes: { ids: string[]; branche: Match['branche'] }[], matchs: Match[]): Match[] {
  const tour = Math.max(0, ...matchs.map(m => m.journee)) + 1;
  let id = Math.max(49999, ...matchs.map(m => m.id)) + 1;
  return groupes.flatMap(({ ids, branche }) => {
    const resultat: Match[] = [];
    for (let i = 0; i + 1 < ids.length; i += 2) resultat.push({ id: id++, journee: tour, equipe1Id: ids[i], equipe2Id: ids[i+1], score1:'', score2:'', branche });
    return resultat;
  });
}
export function prochainTourParcours(format: FormatParcours, equipes: Equipe[], matchs: Match[]): Match[] {
  if (equipes.length < 2) return [];
  if (matchs.some(m => !matchTermine(m) || Number(m.score1) === Number(m.score2))) return [];
  if (!matchs.length) return creerTour([{ids: equipes.map(e => e.id), branche:'principale'}], []);
  if (format === 'doubleElimination') {
    const pertes = defaitesParcours(equipes, matchs);
    const actifs = equipes.filter(e => (pertes.get(e.id) ?? 0) < 2);
    if (actifs.length < 2) return [];
    if (actifs.length === 2) return creerTour([{ ids:actifs.map(e=>e.id), branche:'finale' }], matchs);
    const trier = (ids: string[]) => ids.sort((a,b) => {
      // Participants with a bye in the preceding round play first this round.
      const dernier = Math.max(...matchs.map(m=>m.journee));
      const joue = (id:string) => matchs.some(m=>m.journee===dernier&&(m.equipe1Id===id||m.equipe2Id===id)) ? 1 : 0;
      return joue(a)-joue(b);
    });
    return creerTour([
      {ids:trier(actifs.filter(e=>pertes.get(e.id)===0).map(e=>e.id)),branche:'principale'},
      {ids:trier(actifs.filter(e=>pertes.get(e.id)===1).map(e=>e.id)),branche:'repechage'},
    ], matchs);
  }
  const dernierTour = Math.max(...matchs.map(m=>m.journee));
  const dernier = matchs.filter(m=>m.journee===dernierTour);
  if (dernierTour === 1) return creerTour([
    {ids: dernier.map(vainqueur),branche:'principale'},
    {ids: dernier.map(perdant),branche:'consolante'},
  ], matchs);
  return creerTour(['principale','consolante'].map(branche=>({ids:dernier.filter(m=>m.branche===branche).map(vainqueur),branche:branche as Match['branche']})),matchs);
}
export function classementParcours(format: FormatParcours, equipes: Equipe[], matchs: Match[]): Equipe[] {
  const completes = matchs.filter(m=>matchTermine(m)&&Number(m.score1)!==Number(m.score2));
  const pertes = defaitesParcours(equipes,completes);
  const dernier = (id:string, principale=false) => completes.filter(m=>(!principale||m.branche!=='consolante')&&(m.equipe1Id===id||m.equipe2Id===id)).sort((a,b)=>b.journee-a.journee)[0];
  return [...equipes].sort((a,b)=>{
    if(format==='doubleElimination') {
      const actifA=(pertes.get(a.id)??0)<2, actifB=(pertes.get(b.id)??0)<2;
      if(actifA!==actifB)return actifA?-1:1;
      if(!actifA) return (dernier(b.id)?.journee??0)-(dernier(a.id)?.journee??0)||a.nom.localeCompare(b.nom);
      return (pertes.get(a.id)??0)-(pertes.get(b.id)??0)||a.nom.localeCompare(b.nom);
    }
    const ma=dernier(a.id,true),mb=dernier(b.id,true);
    const scoreA=(ma?.journee??0)*2+(ma&&vainqueur(ma)===a.id?1:0);
    const scoreB=(mb?.journee??0)*2+(mb&&vainqueur(mb)===b.id?1:0);
    return scoreB-scoreA||a.nom.localeCompare(b.nom);
  });
}
export function parcoursTermine(format: FormatParcours, equipes: Equipe[], matchs: Match[]) {
  return matchs.length>0 && matchs.every(m=>matchTermine(m)&&Number(m.score1)!==Number(m.score2)) && prochainTourParcours(format,equipes,matchs).length===0;
}
