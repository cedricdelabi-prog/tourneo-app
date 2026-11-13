export type CoteTennis = 0 | 1;
export type MancheTennis = {score1:string;score2:string};
export type EtatTennis = {points:[number,number];jeux:[number,number];manches:MancheTennis[];victoires:[number,number];decisif:boolean;vainqueur:CoteTennis|null};
export function initialTennis():EtatTennis{return{points:[0,0],jeux:[0,0],manches:[],victoires:[0,0],decisif:false,vainqueur:null};}
export function pointTennis(etat:EtatTennis,cote:CoteTennis,setsGagnants=2):EtatTennis{
 if(!Number.isInteger(setsGagnants)||setsGagnants<1||setsGagnants>5)throw new Error('Format de tennis invalide.');
 if(etat.vainqueur!==null)throw new Error('Le match est terminé.');
 const e:EtatTennis={...etat,points:[...etat.points],jeux:[...etat.jeux],manches:[...etat.manches],victoires:[...etat.victoires]};e.points[cote]++;
 if(e.points[cote]<(e.decisif?7:4)||e.points[cote]-e.points[1-cote]<2)return e;
 e.points=[0,0];e.jeux[cote]++;
 const setTermine=e.decisif||(e.jeux[cote]>=6&&e.jeux[cote]-e.jeux[1-cote]>=2);
 if(setTermine){e.manches.push({score1:String(e.jeux[0]),score2:String(e.jeux[1])});e.victoires[cote]++;e.jeux=[0,0];e.decisif=false;if(e.victoires[cote]===setsGagnants)e.vainqueur=cote;}
 else e.decisif=e.jeux[0]===6&&e.jeux[1]===6;
 return e;
}
export function rejouerTennis(points:unknown,setsGagnants=2):EtatTennis{
 if(!Array.isArray(points)||points.length>10000||points.some(p=>p!==0&&p!==1))throw new Error('Compteur de tennis invalide.');
 return points.reduce<EtatTennis>((e,p)=>pointTennis(e,p,setsGagnants),initialTennis());
}
export function libellesPointsTennis(e:EtatTennis):[string,string]{
 if(e.decisif)return[String(e.points[0]),String(e.points[1])];
 if(e.points[0]>=3&&e.points[1]>=3){if(e.points[0]===e.points[1])return['40','40'];return e.points[0]>e.points[1]?['AD','40']:['40','AD'];}
 return[e.points[0],e.points[1]].map(p=>['0','15','30','40'][p])as[string,string];
}
export function formatStandardTennis(options?:{cibleManche?:number;ecartManche?:number;plafondManche?:number;cibleDecisive?:number}){
 return(!options?.cibleManche||options.cibleManche===6)&&(!options?.ecartManche||options.ecartManche===2)&&(!options?.plafondManche||options.plafondManche===7)&&!options?.cibleDecisive;
}
