import type {Equipe,Match} from '@/types';
import {passagesParticipants} from '@/lib/suivi-matchs';
import {joueursDuMatch,type planifierMatchs,type Creneau} from '@/lib/planning';
export function nettoyerFavoris(value:unknown,equipes:Pick<Equipe,'id'>[]):string[]{return Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string'&&equipes.some(e=>e.id===v)))].slice(0,12):[];}
export function programmeFamille(ids:readonly string[],matchs:Match[],options:Parameters<typeof planifierMatchs>[1],valides:readonly number[]){
 const passages=passagesParticipants(matchs,options,valides),uniques=new Map<number,{match:Match;creneau:Creneau;statut:string;noms:string[]}>();
 for(const id of ids)for(const p of passages.get(id)||[]){const existant=uniques.get(p.match.id);if(existant)existant.noms.push(id);else uniques.set(p.match.id,{match:p.match,creneau:p.creneau,statut:p.statut,noms:[id]});}
 const lignes=[...uniques.values()].sort((a,b)=>a.creneau.debut-b.creneau.debut||a.match.id-b.match.id);
 return lignes.map(a=>({...a,simultane:lignes.some(b=>a.match.id!==b.match.id&&a.creneau.debut<b.creneau.fin&&b.creneau.debut<a.creneau.fin&&!joueursDuMatch(a.match).some(id=>joueursDuMatch(b.match).includes(id)))}));
}
