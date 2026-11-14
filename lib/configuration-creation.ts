import {CATALOGUE_SPORTS} from '@/lib/catalogue-sports';
import type {OptionsV2} from '@/lib/options-v2';
export type ConfigurationCreation={nom:string;sport:string;sportChoisi:boolean;format:string;options:OptionsV2;modePoules:string;nombrePoules:number;taillePoules:number;qualifiesParPoule:number};
export function erreursConfigurationCreation(c:ConfigurationCreation):string[]{
 const erreurs:string[]=[];const entier=(v:number,min:number,max:number)=>Number.isInteger(v)&&v>=min&&v<=max;
 if(!c.nom.trim()||c.nom.trim().length>150)erreurs.push('Ajoutez un nom de tournoi (150 caractères maximum).');
 if(!c.sportChoisi||!CATALOGUE_SPORTS.some(s=>s.code===c.sport))erreurs.push('Choisissez un sport ou une activité.');
 if(!['complet','allerRetour','poules','poulesFinale','elimination','doubleElimination','consolante','suisse','rotation'].includes(c.format))erreurs.push('Choisissez une formule de tournoi valide.');
 if(!entier(c.options.terrains,1,32)||!entier(c.options.duree,1,240)||!entier(c.options.repos,0,120))erreurs.push('Vérifiez les terrains, la durée et le repos.');
 if(c.format==='suisse'&&!entier(c.options.rondes,1,32))erreurs.push('Choisissez entre 1 et 32 rondes suisses.');
 if(c.format==='poules'||c.format==='poulesFinale'){
  if(c.modePoules==='nombrePoules'?!entier(c.nombrePoules,2,128):c.modePoules==='taillePoules'?!entier(c.taillePoules,2,256):true)erreurs.push('Vérifiez le nombre ou la taille des poules.');
  if(c.format==='poulesFinale'&&(!entier(c.qualifiesParPoule,1,128)||(c.modePoules==='taillePoules'&&c.qualifiesParPoule>c.taillePoules)))erreurs.push('Vérifiez le nombre de qualifiés par poule.');
 }
 if(c.options.score==='sets'&&(!entier(c.options.setsGagnants,1,5)||!entier(c.options.cibleManche,0,1000)||!entier(c.options.ecartManche,1,10)||!entier(c.options.plafondManche,0,1000)||(c.options.plafondManche>0&&c.options.plafondManche<c.options.cibleManche)))erreurs.push('Vérifiez le barème des manches et leur plafond.');
 return erreurs;
}
