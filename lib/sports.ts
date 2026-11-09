import type { OptionsV2 } from '@/lib/options-v2';
export function reglesPourSport(sport:string):Partial<OptionsV2>{
 const commun={score:'points' as const,cibleManche:0,ecartManche:1,plafondManche:0,cibleDecisive:0};
 if(sport==='badminton')return{...commun,score:'sets',setsGagnants:2,cibleManche:21,ecartManche:2,plafondManche:30};
 if(sport==='ping-pong')return{...commun,score:'sets',setsGagnants:3,cibleManche:11,ecartManche:2};
 if(sport==='volley')return{...commun,score:'sets',setsGagnants:3,cibleManche:25,ecartManche:2,cibleDecisive:15};
 if(sport==='tennis'||sport==='padel')return{...commun,score:'sets',setsGagnants:2,cibleManche:6,ecartManche:2,plafondManche:7};
 return commun;
}
export function erreurScoreSport(sport:string,score1:number,score2:number,options:OptionsV2,manches:{score1:string;score2:string}[]=[]):string{
 if(options.score==='points'){
   const cible=sport==='petanque'?13:sport==='molkky'?50:0;
   if(cible&&(Math.max(score1,score2)!==cible||Math.min(score1,score2)>=cible))return `Le vainqueur doit avoir ${cible} points et son adversaire moins de ${cible}.`;
   if(['basket','tennis','padel','badminton','ping-pong','volley','squash','petanque','molkky'].includes(sport)&&score1===score2)return 'Ce sport nécessite un vainqueur. Complétez le résultat après le départage.';
   return '';
 }
 let victoires1=0,victoires2=0;
 for(let i=0;i<manches.length;i++){
   if(victoires1>=options.setsGagnants||victoires2>=options.setsGagnants)break;
   const m=manches[i];if(m.score1===''||m.score2==='')return 'Terminez les manches dans l’ordre.';
   const a=Number(m.score1),b=Number(m.score2),haut=Math.max(a,b),bas=Math.min(a,b);
   if(a===b)return 'Chaque manche doit avoir un vainqueur.';
   const decisive=i===options.setsGagnants*2-2;
   const cible=decisive&&options.cibleDecisive?options.cibleDecisive:options.cibleManche;
   if(cible){
     const cap=options.plafondManche;
     const normal=((haut===cible&&haut-bas>=options.ecartManche)||(haut>cible&&haut-bas===options.ecartManche))&&(!cap||haut<=cap);
     const plafond=cap>0&&haut===cap&&bas===cap-1;
     if(!(normal||plafond))return `Manche ${i+1} : résultat incompatible avec l’objectif (${cible} points, écart ${options.ecartManche}${cap?`, plafond ${cap}`:''}).`;
   }
   if(a>b)victoires1++;else victoires2++;
 }
 if(Math.max(victoires1,victoires2)<options.setsGagnants||score1!==victoires1||score2!==victoires2)return 'La série n’est pas terminée.';
 return '';
}
