export type OptionsV2 = {
  tirage: 'aleatoire' | 'equilibre' | 'manuel';
  mode: 'simple' | 'expert' | 'camping';
  score: 'points' | 'sets';
  setsGagnants: number;
  cibleManche:number;
  ecartManche:number;
  plafondManche:number;
  cibleDecisive:number;
  pointsVictoire: number;
  pointsNul: number;
  pointsDefaite: number;
  rondes: number;
  exemptions: { ronde: number; id: string }[];
  terrains: number;
  duree: number;
  repos: number;
  depart: string;
};
export const OPTIONS_V2: OptionsV2 = { tirage:'aleatoire',mode:'simple',score:'points',setsGagnants:2,cibleManche:0,ecartManche:1,plafondManche:0,cibleDecisive:0,pointsVictoire:3,pointsNul:1,pointsDefaite:0,rondes:4,exemptions:[],terrains:1,duree:15,repos:0,depart:'' };
export function normaliserOptionsV2(value: Partial<OptionsV2> | undefined): OptionsV2 {
  const source = value || {};
  const entier = (v: unknown, min:number,max:number,defaut:number) => typeof v==='number' && Number.isInteger(v)&&v>=min&&v<=max ? v : defaut;
  return {...OPTIONS_V2,
    tirage:source.tirage==='equilibre'||source.tirage==='manuel'?source.tirage:'aleatoire',
    mode: ['simple','expert','camping'].includes(String(source.mode)) ? source.mode! : 'simple',
    score: source.score === 'sets' ? 'sets' : 'points',
    cibleManche:entier(source.cibleManche,0,1000,0),ecartManche:entier(source.ecartManche,1,10,1),plafondManche:entier(source.plafondManche,0,1000,0),cibleDecisive:entier(source.cibleDecisive,0,1000,0),
    setsGagnants:entier(source.setsGagnants,1,5,2), pointsVictoire:entier(source.pointsVictoire,0,100,3),pointsNul:entier(source.pointsNul,0,100,1),pointsDefaite:entier(source.pointsDefaite,0,100,0),
    rondes:entier(source.rondes,1,32,4),terrains:entier(source.terrains,1,32,1),duree:entier(source.duree,1,240,15),repos:entier(source.repos,0,120,0),
    depart:typeof source.depart==='string'&&Number.isFinite(Date.parse(source.depart))?source.depart:'',
    exemptions:Array.isArray(source.exemptions)?source.exemptions.filter(e=>e&&typeof e.id==='string'&&Number.isInteger(e.ronde)&&e.ronde>0&&e.ronde<=32):[],
  };
}
