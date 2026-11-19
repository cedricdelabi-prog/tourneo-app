import type { Equipe, Match } from '@/types';

export type CopiePourComparaison = {
  nom: string;
  sport: string;
  formatTournoi: string;
  equipes: readonly Equipe[];
  matchs: readonly Match[];
  matchsValides: readonly number[];
  optionsV2?: unknown;
};

export type LigneDifference = {
  id: number;
  rencontre: string;
  local: string;
  distant: string;
  raison: 'Score ou validation' | 'Organisation du match' | 'Rencontre absente';
};

export type RapportConflit =
  | { disponible: false }
  | {
      disponible: true;
      local: { participants: number; matchs: number; valides: number };
      distant: { participants: number; matchs: number; valides: number };
      participantsDifferents: number;
      matchsDifferents: number;
      lignes: LigneDifference[];
      lignesMasquees: number;
      champsDifferents: string[];
    };

type DonneesVersion = Record<string, unknown>;
const MAX_LIGNES = 8;

function objet(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function listeValideEquipe(v: unknown): v is Equipe[] {
  return Array.isArray(v) && v.every(e=>objet(e)&&typeof e.id==='string'&&typeof e.nom==='string');
}
function listeValideMatch(v: unknown): v is Match[] {
  return Array.isArray(v) && v.every(m=>objet(m)&&Number.isSafeInteger(m.id)&&Number(m.id)>0&&
    typeof m.equipe1Id==='string'&&typeof m.equipe2Id==='string'&&
    typeof m.score1==='string'&&typeof m.score2==='string');
}
function idsUniques<T extends {id:string|number}>(lignes:readonly T[]):boolean {
  return new Set(lignes.map(e=>e.id)).size===lignes.length;
}
function canonique(value: unknown): string {
  if (Array.isArray(value)) return '['+value.map(canonique).join(',')+']';
  if (objet(value)) return '{'+Object.entries(value).filter(([,v])=>v!==undefined)
    .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonique(v)).join(',')+'}';
  return JSON.stringify(value) ?? 'null';
}
function empreinteEquipe(e: Equipe): string {
  return canonique({
    nom:e.nom, joueurs:e.joueurs??[], capitaine:e.capitaine, profilId:e.profilId,
    membresOrigine:e.membresOrigine, photo:e.photo, niveau:e.niveau,
    position:e.position, poule:e.poule, emoji:e.emoji, couleur:e.couleur
  });
}
function titreRencontre(m:Match|undefined, equipes:Map<string,string>):string {
  if(!m)return 'Match';
  const nom=(id:string):string=>{
    if(equipes.has(id))return equipes.get(id)!;
    if(id.startsWith('duo:'))return id.slice(4).split('|').map(n=>equipes.get(n)??'Joueur').join(' / ');
    return 'Participant';
  };
  return (nom(m.equipe1Id)+' — '+nom(m.equipe2Id)).slice(0,160);
}
function affichageScore(m:Match|undefined, valides:ReadonlySet<number>):string {
  if(!m)return 'Absent';
  if(m.score1===''&&m.score2==='')return 'Non saisi';
  return (m.score1||'…')+' – '+(m.score2||'…')+(valides.has(m.id)?' ✓':'');
}
function empreinteStructure(m:Match):string {
  return canonique({equipe1Id:m.equipe1Id,equipe2Id:m.equipe2Id,joueurs1Ids:m.joueurs1Ids,
    joueurs2Ids:m.joueurs2Ids,journee:m.journee,terrain:m.terrain,ordre:m.ordre,branche:m.branche});
}
function empreinteScore(m:Match, valides:ReadonlySet<number>):string {
  return canonique({score1:m.score1,score2:m.score2,manches:m.manches,valides:valides.has(m.id)});
}

/** Diagnostic en lecture seule : ne décide jamais de fusionner ni de remplacer un tournoi. */
export function comparerVersionsTournoi(local:CopiePourComparaison, cloud:{
  nom?:string; sport?:string; donnees?:unknown;
}):RapportConflit {
  const d=cloud?.donnees;
  if(!objet(d)||!listeValideEquipe(d.equipes)||!listeValideMatch(d.matchs)||
     !Array.isArray(d.matchsValides)||!d.matchsValides.every(n=>Number.isSafeInteger(n))||
     !listeValideEquipe(local.equipes)||!listeValideMatch(local.matchs)||
     !idsUniques(d.equipes)||!idsUniques(d.matchs)||!idsUniques(local.equipes)||!idsUniques(local.matchs)) {
    return {disponible:false};
  }
  const equipesCloud=d.equipes, matchsCloud=d.matchs;
  const scoresLocal=new Set(local.matchsValides),scoresCloud=new Set<number>(d.matchsValides);
  const idsLocal=new Set(local.matchs.map(m=>m.id)), idsCloud=new Set(matchsCloud.map(m=>m.id));
  const valides=(matchs:readonly Match[],ids:ReadonlySet<number>)=>
    matchs.filter(m=>ids.has(m.id)&&m.score1!==''&&m.score2!=='').length;
  const carteEquipeLocal=new Map(local.equipes.map(e=>[e.id,empreinteEquipe(e)]));
  const carteEquipeCloud=new Map(equipesCloud.map(e=>[e.id,empreinteEquipe(e)]));
  const participantsDifferents=new Set([...carteEquipeLocal.keys(),...carteEquipeCloud.keys()]);
  let modificationsParticipants=0;
  for(const id of participantsDifferents)
    if(carteEquipeLocal.get(id)!==carteEquipeCloud.get(id))modificationsParticipants++;
  const noms=new Map([...equipesCloud,...local.equipes].map(e=>[e.id,e.nom]));
  const loc=new Map(local.matchs.map(m=>[m.id,m])),dist=new Map(matchsCloud.map(m=>[m.id,m]));
  const ids=[...new Set([...idsLocal,...idsCloud])].sort((a,b)=>a-b);
  const lignes:LigneDifference[]=[];
  let matchsDifferents=0;
  for(const id of ids){
    const a=loc.get(id),b=dist.get(id);
    const raison:LigneDifference['raison']|null=!a||!b?'Rencontre absente':
      empreinteScore(a,scoresLocal)!==empreinteScore(b,scoresCloud)?'Score ou validation':
      empreinteStructure(a)!==empreinteStructure(b)?'Organisation du match':null;
    if(!raison)continue;
    matchsDifferents++;
    if(lignes.length<MAX_LIGNES)lignes.push({
      id,rencontre:titreRencontre(a??b,noms),local:affichageScore(a,scoresLocal),
      distant:affichageScore(b,scoresCloud),raison
    });
  }
  const champsDifferents:string[]=[];
  if(typeof cloud.nom==='string'&&local.nom!==cloud.nom)champsDifferents.push('Nom du tournoi');
  if(typeof cloud.sport==='string'&&local.sport!==cloud.sport)champsDifferents.push('Sport');
  if(typeof d.formatTournoi==='string'&&local.formatTournoi!==d.formatTournoi)champsDifferents.push('Format');
  if(d.optionsV2!==undefined&&canonique(local.optionsV2)!==canonique(d.optionsV2))champsDifferents.push('Réglages');
  return {
    disponible:true,
    local:{participants:local.equipes.length,matchs:local.matchs.length,valides:valides(local.matchs,scoresLocal)},
    distant:{participants:equipesCloud.length,matchs:matchsCloud.length,valides:valides(matchsCloud,scoresCloud)},
    participantsDifferents:modificationsParticipants,matchsDifferents,lignes,
    lignesMasquees:matchsDifferents-lignes.length,champsDifferents
  };
}
