import {normaliserAdaptationPlanning,type OptionsV2} from '@/lib/options-v2';
import type { Match } from '@/types';
export type Creneau = { matchId:number; terrain:number; debut:number; fin:number; journee:number };
export function affecterTerrain(matchs: Match[], matchId: number, terrain?: number): Match[] {
  if (terrain !== undefined && (!Number.isInteger(terrain) || terrain < 1 || terrain > 32)) throw new Error('Terrain invalide.');
  return matchs.map(m => m.id === matchId ? { ...m, terrain } : m);
}
export function terrainDisponible(terrain: unknown, terrains: number): terrain is number {
  return typeof terrain === 'number' && Number.isInteger(terrain) && terrain >= 1 && terrain <= terrains;
}
export function joueursDuMatch(match: Match): string[] {
  const cote = (id: string, joueurs?: string[]) => joueurs?.length ? joueurs : id.startsWith('duo:') ? id.slice(4).split('|') : [id];
  return [...new Set([...cote(match.equipe1Id, match.joueurs1Ids), ...cote(match.equipe2Id, match.joueurs2Ids)])];
}
export function planifierMatchs(matchs: Match[], options: { terrains:number;duree:number;repos:number;adaptationPlanning?:OptionsV2['adaptationPlanning'] }): Creneau[] {
  const { terrains,duree,repos }=options;
  if(!Number.isInteger(terrains)||terrains<1||terrains>32||!Number.isFinite(duree)||duree<=0||!Number.isFinite(repos)||repos<0) throw new Error('Paramètres de planning invalides');
  const adaptation=normaliserAdaptationPlanning(options.adaptationPlanning),fixes=new Map((adaptation?.fixes||[]).filter(c=>matchs.some(m=>m.id===c.matchId)).map(c=>[c.matchId,c]));
  const fermes=new Set(adaptation?.terrainsFermes||[]);
  if(matchs.some(m=>!fixes.has(m.id))&&Array.from({length:terrains},(_,i)=>i+1).every(n=>fermes.has(n)))throw new Error('Gardez au moins un terrain disponible.');
  const dispos=Array(terrains).fill(0) as number[], joueurs=new Map<string,number>(), resultat:Creneau[]=[];
  const jours=[...new Set(matchs.map(m=>m.journee))].sort((a,b)=>a-b);
  for(const m of matchs){const f=fixes.get(m.id);if(!f)continue;if(f.terrain<=terrains)dispos[f.terrain-1]=Math.max(dispos[f.terrain-1],f.fin);for(const id of joueursDuMatch(m))joueurs.set(id,Math.max(joueurs.get(id)||0,f.fin+repos));}
  let debutRonde=0;
  for(const journee of jours){
    const tour=matchs.filter(m=>m.journee===journee).sort((a,b)=>(a.ordre??a.id)-(b.ordre??b.id));
    for(const m of tour){
      const fixe=fixes.get(m.id);if(fixe){resultat.push({...fixe,journee:m.journee});continue;}
      const participants = joueursDuMatch(m);
      const candidats=dispos.map((dispo,i)=>({terrain:i+1,debut:Math.max(debutRonde,adaptation?.debutMinimum||0,dispo,...participants.map(id=>joueurs.get(id)??0))}))
        .filter(c => !fermes.has(c.terrain)&&(!terrainDisponible(m.terrain,terrains)||fermes.has(m.terrain!)||c.terrain===m.terrain));
      const libre=candidats.sort((a,b)=>a.debut-b.debut||a.terrain-b.terrain)[0];
      const fin=libre.debut+duree;
      dispos[libre.terrain-1]=fin;
      for(const id of participants)joueurs.set(id,fin+repos);
      resultat.push({matchId:m.id,terrain:libre.terrain,debut:libre.debut,fin,journee});
    }
    debutRonde=Math.max(debutRonde,...resultat.filter(c=>c.journee===journee).map(c=>c.fin));
  }
  return resultat;
}
export function heureCreneau(minutes:number,depart:string){
  if(!depart) return `+${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')}`;
  const date=new Date(new Date(depart).getTime()+minutes*60000);
  return date.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
