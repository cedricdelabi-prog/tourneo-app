import type {Match,Equipe} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {planifierMatchs,heureCreneau,type Creneau} from '@/lib/planning';

export type ChangementPlanning={avant:Creneau;apres:Creneau};

/** Build a scenario without modifying matches or their saved results. */
export function preparerImprevu(matchs:Match[],valides:readonly number[],options:OptionsV2,retard:number,terrainsFermes:number[]){
 if(!Number.isInteger(retard)||retard<0||retard>240)throw new Error('Indiquez un retard entre 0 et 240 minutes.');
 if(!Array.isArray(terrainsFermes)||terrainsFermes.some(n=>!Number.isInteger(n)||n<1||n>options.terrains))
  throw new Error('Sélectionnez uniquement des terrains existants.');
 const fermes=[...new Set(terrainsFermes)].sort((a,b)=>a-b);
 if(fermes.length>=options.terrains)throw new Error('Gardez au moins un terrain ouvert pour poursuivre le tournoi.');
 const avant=planifierMatchs(matchs,options);
 const scoresSauvegardes=new Set(valides);
 const proteges=new Set(matchs.filter(m=>scoresSauvegardes.has(m.id)||m.score1!==''||m.score2!==''||m.manches?.some(s=>s.score1!==''||s.score2!=='')).map(m=>m.id));
 const restants=avant.filter(c=>!proteges.has(c.matchId));
 if(!restants.length)throw new Error('Aucune rencontre sans score à replanifier.');
 const adaptationPlanning={
  debutMinimum:Math.min(...restants.map(c=>c.debut))+retard,
  terrainsFermes:fermes,
  fixes:avant.filter(c=>proteges.has(c.matchId)).map(({matchId,terrain,debut,fin})=>({matchId,terrain,debut,fin}))
 };
 const nouvellesOptions:OptionsV2={...options,adaptationPlanning};
 const apres=planifierMatchs(matchs,nouvellesOptions),ancien=new Map(avant.map(c=>[c.matchId,c]));
 const nouveaux=new Map(apres.map(c=>[c.matchId,c]));
 for(const c of avant.filter(c=>proteges.has(c.matchId))){
  const n=nouveaux.get(c.matchId);
  if(!n||c.terrain!==n.terrain||c.debut!==n.debut||c.fin!==n.fin)
   throw new Error('Le planning proposé modifierait une rencontre avec score : opération annulée.');
 }
 const changements:ChangementPlanning[]=apres.filter(c=>{
  const a=ancien.get(c.matchId);
  return !!a&&(c.debut!==a.debut||c.terrain!==a.terrain);
 }).map(c=>({avant:ancien.get(c.matchId)!,apres:c}));
 const finAvant=Math.max(...avant.map(c=>c.fin)),finApres=Math.max(...apres.map(c=>c.fin));
 const bilan={
  total:avant.length,
  restants:restants.length,
  deplaces:changements.length,
  terrainsModifies:changements.filter(c=>c.avant.terrain!==c.apres.terrain).length,
  horairesModifies:changements.filter(c=>c.avant.debut!==c.apres.debut).length,
  retardMaximum:Math.max(0,...changements.map(c=>c.apres.debut-c.avant.debut)),
  variationFin:finApres-finAvant,
  inchanges:avant.length-changements.length
 };
 return{options:nouvellesOptions,changements,finAvant,finApres,proteges:proteges.size,bilan};
}
export function estimationFin(planning:Creneau[],depart:string){
 const minutes=Math.max(0,...planning.map(c=>c.fin)),date=Date.parse(depart);
 return{minutes,date:Number.isFinite(date)?new Date(date+minutes*60000):null};
}

/** Spreadsheet-friendly export; guards cells from Excel formula injection. */
export function exporterComparaisonImprevu(
 changements:readonly ChangementPlanning[],matchs:readonly Match[],equipes:readonly Equipe[],depart:string
):string{
 const joueurs=new Map(equipes.map(e=>[e.id,e.nom]));
 const rencontres=new Map(matchs.map(m=>[m.id,m]));
 const cellule=(value:unknown)=>{
  let texte=String(value??'');
  if(/^[\s\t\r\n]*[=+@-]/u.test(texte))texte="'"+texte;
  return '"'+texte.replace(/"/g,'""')+'"';
 };
 const lignes:[string,...string[]][]=[
  ['Match','Équipes','Terrain avant','Terrain après','Horaire avant','Horaire après','Décalage (min)']
 ];
 for(const {avant,apres} of changements){
  const m=rencontres.get(apres.matchId);
  const participants=m?`${joueurs.get(m.equipe1Id)||m.equipe1Id} / ${joueurs.get(m.equipe2Id)||m.equipe2Id}`:'Match inconnu';
  lignes.push([String(apres.matchId),participants,String(avant.terrain),String(apres.terrain),heureCreneau(avant.debut,depart),heureCreneau(apres.debut,depart),String(apres.debut-avant.debut)]);
 }
 return '\uFEFF'+lignes.map(ligne=>ligne.map(cellule).join(';')).join('\r\n')+'\r\n';
}
