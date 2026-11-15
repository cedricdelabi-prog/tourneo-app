import type {Match} from '@/types';
export type PagePhase={cle:string;titre:string;numero:number;total:number;matchs:Match[]};
export function nomPhase(matchs:Match[],format:string,journee:number,branche=''){
 if(branche)return branche==='finale'?'Finale':`Tour ${journee} · ${branche==='principale'?'Tableau principal':branche==='repechage'?'Repêchage':'Consolante'}`;
 if(format==='suisse')return `Ronde ${journee}`;
 if(format==='elimination'||matchs.every(m=>m.id>=100000)){
  const taille=2**Math.ceil(Math.log2(Math.max(1,matchs.length)));
  return taille===1?'Finale':taille===2?'Demi-finales':taille===4?'Quarts de finale':taille===8?'Huitièmes de finale':`Tour ${journee}`;
 }
 return `${format==='poules'||format==='poulesFinale'?'Poules · journée':'Journée'} ${journee}`;
}
export function pagesPhases(matchs:Match[],format:string,limite=12):PagePhase[]{
 const groupes=new Map<string,Match[]>();
 for(const m of [...matchs].sort((a,b)=>a.journee-b.journee||(a.ordre??a.id)-(b.ordre??b.id))){
  const cle=`${m.journee}:${m.branche??(m.id>=100000?'finale':'poules')}`;
  groupes.set(cle,[...(groupes.get(cle)??[]),m]);
 }
 const pages:PagePhase[]=[];const taille=Math.max(1,Math.floor(limite)||12);
 for(const[cle,liste]of groupes){const total=Math.ceil(liste.length/taille),titre=nomPhase(liste,format,liste[0].journee,liste[0].branche);
  for(let i=0;i<total;i++)pages.push({cle,titre,numero:i+1,total,matchs:liste.slice(i*taille,(i+1)*taille)});
 }
 return pages;
}
