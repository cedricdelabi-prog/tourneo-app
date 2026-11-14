import type {Match} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {planifierMatchs,type Creneau} from '@/lib/planning';
export function preparerImprevu(matchs:Match[],valides:readonly number[],options:OptionsV2,retard:number,terrainsFermes:number[]){
 if(!Number.isInteger(retard)||retard<0||retard>240)throw new Error('Indiquez un retard entre 0 et 240 minutes.');
 const avant=planifierMatchs(matchs,options),proteges=new Set(matchs.filter(m=>valides.includes(m.id)||m.score1!==''||m.score2!==''||m.manches?.some(s=>s.score1!==''||s.score2!=='')).map(m=>m.id));
 const restants=avant.filter(c=>!proteges.has(c.matchId));if(!restants.length)throw new Error('Aucune rencontre sans score à replanifier.');
 const adaptationPlanning={debutMinimum:Math.min(...restants.map(c=>c.debut))+retard,terrainsFermes:[...new Set(terrainsFermes)],fixes:avant.filter(c=>proteges.has(c.matchId)).map(({matchId,terrain,debut,fin})=>({matchId,terrain,debut,fin}))};
 const nouvellesOptions={...options,adaptationPlanning},apres=planifierMatchs(matchs,nouvellesOptions),old=new Map(avant.map(c=>[c.matchId,c]));
 const changements=apres.filter(c=>{const a=old.get(c.matchId)!;return c.debut!==a.debut||c.terrain!==a.terrain;}).map(c=>({avant:old.get(c.matchId)!,apres:c}));
 return{options:nouvellesOptions,changements,finAvant:Math.max(...avant.map(c=>c.fin)),finApres:Math.max(...apres.map(c=>c.fin)),proteges:proteges.size};
}
export function estimationFin(planning:Creneau[],depart:string){const minutes=Math.max(0,...planning.map(c=>c.fin)),date=Date.parse(depart);return{minutes,date:Number.isFinite(date)?new Date(date+minutes*60000):null};}
