import type {Equipe,Match} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {scoreValide} from '@/lib/formats-avances';
import {planifierMatchs,type Creneau} from '@/lib/planning';

export type StatutCockpit='valide'|'aValider'|'saisieIncomplet'|'aJouer';
export type MatchCockpit={match:Match;statut:StatutCockpit;creneau:Creneau|null};
export type BilanCockpit={
 total:number;valides:number;aValider:number;saisiesIncompletes:number;aJouer:number;
 progression:number;prioritaire:MatchCockpit|null;liste:MatchCockpit[];
};
/** Scores entered but not confirmed are never counted as validated. */
export function statutMatchCockpit(match:Match,confirmes:ReadonlySet<number>):StatutCockpit{
 if(confirmes.has(match.id))return 'valide';
 if(scoreValide(match.score1)&&scoreValide(match.score2))return 'aValider';
 const commence=String(match.score1??'').trim()!==''||String(match.score2??'').trim()!==''||
  !!match.manches?.some(m=>String(m.score1??'').trim()!==''||String(m.score2??'').trim()!=='');
 return commence?'saisieIncomplet':'aJouer';
}
/** Pure, score-preserving organizer overview; ordered by scheduled time, not match ID. */
export function bilanCockpitTournoi(matchs:readonly Match[],valides:readonly number[],options:OptionsV2):BilanCockpit{
 const confirms=new Set(valides);
 let creneaux:Creneau[]=[];
 try{creneaux=planifierMatchs([...matchs],options);}catch{/* A broken planning must not hide scores or organizer actions. */}
 const horaires=new Map(creneaux.map(c=>[c.matchId,c]));
 const liste=matchs.map(match=>({match,statut:statutMatchCockpit(match,confirms),creneau:horaires.get(match.id)||null}));
 liste.sort((a,b)=>(a.creneau?.debut??Number.MAX_SAFE_INTEGER)-(b.creneau?.debut??Number.MAX_SAFE_INTEGER)||
   (a.creneau?.terrain??Number.MAX_SAFE_INTEGER)-(b.creneau?.terrain??Number.MAX_SAFE_INTEGER)||
   (a.match.journee-b.match.journee)||((a.match.ordre??a.match.id)-(b.match.ordre??b.match.id)));
 const compte=(statut:StatutCockpit)=>liste.filter(x=>x.statut===statut).length;
 const confirmes=compte('valide'),aValider=compte('aValider'),saisiesIncompletes=compte('saisieIncomplet'),aJouer=compte('aJouer');
 const prioritaire=liste.find(x=>x.statut==='aValider')||liste.find(x=>x.statut==='saisieIncomplet')||
    liste.find(x=>x.statut==='aJouer')||null;
 return{
  total:liste.length,valides:confirmes,aValider,saisiesIncompletes,aJouer,
  progression:liste.length?Math.round(100*confirmes/liste.length):0,prioritaire,liste
 };
}

export type FiltreMatchsCockpit=StatutCockpit|'tous';
const rechercheNormalisee=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();

/** Filter display only, never scores, validation or saved match order. */
export function filtrerMatchsCockpit(liste:readonly MatchCockpit[],filtre:FiltreMatchsCockpit,recherche:string,terrain:number|null,equipes:readonly Equipe[]):MatchCockpit[]{
 const texte=rechercheNormalisee(recherche);
 const noms=new Map(equipes.map(e=>[e.id,rechercheNormalisee(e.nom)]));
 return liste.filter(({match,statut,creneau})=>{
  if(filtre!=='tous'&&statut!==filtre)return false;
  if(terrain!==null&&(creneau?.terrain??match.terrain)!==terrain)return false;
  if(!texte)return true;
  const cible=[String(match.id),noms.get(match.equipe1Id)||rechercheNormalisee(match.equipe1Id),noms.get(match.equipe2Id)||rechercheNormalisee(match.equipe2Id)].join(' ');
  return cible.includes(texte);
 });
}
