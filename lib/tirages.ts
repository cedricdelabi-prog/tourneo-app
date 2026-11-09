import type { Equipe } from '@/types';
export type Tirage = 'aleatoire' | 'equilibre' | 'manuel';
export function ordreParticipants(equipes:Equipe[],mode:Tirage,aleatoire:()=>number=Math.random):Equipe[]{
  const resultat=[...equipes];
  if(mode==='manuel')return resultat.sort((a,b)=>(a.position??0)-(b.position??0));
  if(mode==='equilibre')return resultat.sort((a,b)=>(b.niveau??1)-(a.niveau??1)||a.nom.localeCompare(b.nom));
  for(let i=resultat.length-1;i>0;i--){const j=Math.floor(aleatoire()*(i+1));[resultat[i],resultat[j]]=[resultat[j],resultat[i]];}
  return resultat;
}
export function repartirPoules(equipes:Equipe[],nombre:number,mode:Tirage):Equipe[][]{
  if(!Number.isInteger(nombre)||nombre<1||nombre>equipes.length)throw new Error('Nombre de poules invalide');
  const poules=Array.from({length:nombre},()=>[] as Equipe[]);
  ordreParticipants(equipes,mode).forEach((e,i)=>{
    const ligne=Math.floor(i/nombre),colonne=i%nombre;
    const index=mode==='manuel'&&e.poule&&e.poule<=nombre?e.poule-1:mode==='equilibre'&&ligne%2===1?nombre-1-colonne:colonne;
    poules[index].push(e);
  });
  return poules;
}
export function ordreElimination(equipes:Equipe[],mode:Tirage):Equipe[]{
  const ordre=ordreParticipants(equipes,mode);if(mode!=='equilibre')return ordre;
  const resultat:Equipe[]=[];while(ordre.length){resultat.push(ordre.shift()!);if(ordre.length)resultat.push(ordre.pop()!);}return resultat;
}
