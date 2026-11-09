import type { Equipe,Match,Classement } from '@/types';
import { calculerClassement } from '@/lib/tournoi';
import { classementParcours,parcoursTermine } from '@/lib/parcours';
import { matchTermine } from '@/lib/formats-avances';
import { normaliserOptionsV2,type OptionsV2 } from '@/lib/options-v2';
export function classementTournoi(format:string,equipes:Equipe[],matchs:Match[],regles?:OptionsV2):Classement[]{
  const options=normaliserOptionsV2(regles);const lignes=calculerClassement(equipes,matchs,options);
  if(format==='doubleElimination'||format==='consolante')return classementParcours(format,equipes,matchs).map(e=>lignes.find(l=>l.equipe.id===e.id)!);
  if(format==='elimination'||format==='poulesFinale'){
    const phase=matchs.filter(m=>format==='elimination'||m.id>=100000).filter(matchTermine);
    const score=(id:string)=>{const dernier=phase.filter(m=>m.equipe1Id===id||m.equipe2Id===id).sort((a,b)=>b.journee-a.journee)[0];if(!dernier)return 0;const victoire=(Number(dernier.score1)>Number(dernier.score2)?dernier.equipe1Id:dernier.equipe2Id)===id;return dernier.journee*2+(victoire?1:0);};
    return lignes.sort((a,b)=>score(b.equipe.id)-score(a.equipe.id)||b.pts-a.pts||b.diff-a.diff||a.equipe.nom.localeCompare(b.equipe.nom));
  }
  return lignes;
}
export function tournoiEstTermine(format:string,equipes:Equipe[],matchs:Match[],regles?:OptionsV2,valides?:readonly number[]):boolean{
  if(!matchs.length||!matchs.every(matchTermine)||valides&&!matchs.every(m=>valides.includes(m.id)))return false;
  if(format==='doubleElimination'||format==='consolante')return parcoursTermine(format,equipes,matchs);
  if(format==='suisse')return Math.max(...matchs.map(m=>m.journee))>=normaliserOptionsV2(regles).rondes;
  if(format==='elimination'||format==='poulesFinale'){
    const phase=matchs.filter(m=>format==='elimination'||m.id>=100000);
    const finale=phase.filter(m=>m.journee===Math.max(...phase.map(m=>m.journee)));
    return finale.length===1&&Number(finale[0].score1)!==Number(finale[0].score2);
  }
  return true;
}
export function pointsPalmares(rang:number){return rang===1?100:rang===2?70:rang<=4?50:rang<=8?30:10;}
