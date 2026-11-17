import type {Equipe} from '@/types';
export type InscritAccepte={id:string;nom:string;joueurs?:string[]|null;user_id?:string|null;type_participant?:string};
export type InscriptionAcceptee=InscritAccepte;
export function sourcesParticipants(equipes:Equipe[]):Equipe[]{return [...new Map(equipes.flatMap(e=>e.membresOrigine?.length?e.membresOrigine:[e]).map(e=>[e.id,e])).values()];}
export function fusionnerInscrits(equipes:Equipe[],inscrits:InscritAccepte[]):Equipe[]{
 const groupes=equipes.some(e=>e.membresOrigine?.length);
 if(groupes){
  const ids=new Set(inscrits.map(i=>`inscription:${i.id}`));
  for(const e of equipes)if(e.membresOrigine?.some(m=>m.id.startsWith('inscription:')&&!ids.has(m.id)))throw Error('Une inscription utilisée dans les équipes a été retirée. Reprenez la liste des participants avant de refaire les équipes.');
  const sources=sourcesParticipants(equipes),existants=new Set(sources.map(e=>e.id));
  const comptes=new Set(sources.map(e=>e.profilId).filter(Boolean));
  if(inscrits.some(i=>!existants.has(`inscription:${i.id}`)&&!(i.type_participant==='individuel'&&i.user_id&&comptes.has(i.user_id))))throw Error('De nouveaux inscrits sont arrivés. Reprenez la liste des participants avant de refaire les équipes.');
  return equipes;
 }
 const comptes=new Set(inscrits.filter(i=>i.type_participant==='individuel'&&i.user_id).map(i=>i.user_id));
 const manuels=equipes.filter(e=>!e.id.startsWith('inscription:')&&!comptes.has(e.profilId??e.id));
 if(inscrits.some(i=>manuels.some(e=>e.nom.trim().toLocaleLowerCase('fr')===i.nom.trim().toLocaleLowerCase('fr'))))throw Error('Un participant manuel porte le nom d’une inscription acceptée. Renommez-le avant de démarrer.');
 return [...manuels,...inscrits.map(i=>{const ancien=equipes.find(e=>e.id===`inscription:${i.id}`);return {...ancien,id:`inscription:${i.id}`,nom:i.nom,joueurs:i.joueurs||[],profilId:i.type_participant==='individuel'?i.user_id||undefined:undefined,emoji:ancien?.emoji||'🏅',couleur:ancien?.couleur||'#3B82F6'};})];
}
export const fusionnerInscriptions=fusionnerInscrits;
