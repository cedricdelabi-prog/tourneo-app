import type { Match } from '@/types';
export type Creneau = { matchId:number; terrain:number; debut:number; fin:number; journee:number };
export function planifierMatchs(matchs: Match[], options: { terrains:number;duree:number;repos:number }): Creneau[] {
  const { terrains,duree,repos }=options;
  if(!Number.isInteger(terrains)||terrains<1||terrains>32||!Number.isFinite(duree)||duree<=0||!Number.isFinite(repos)||repos<0) throw new Error('Paramètres de planning invalides');
  const dispos=Array(terrains).fill(0) as number[], joueurs=new Map<string,number>(), resultat:Creneau[]=[];
  const jours=[...new Set(matchs.map(m=>m.journee))].sort((a,b)=>a-b);
  let debutRonde=0;
  for(const journee of jours){
    const tour=matchs.filter(m=>m.journee===journee).sort((a,b)=>(a.ordre??a.id)-(b.ordre??b.id));
    for(const m of tour){
      const candidats=dispos.map((dispo,i)=>({terrain:i+1,debut:Math.max(debutRonde,dispo,...([...m.joueurs1Ids??[m.equipe1Id],...m.joueurs2Ids??[m.equipe2Id]].map(id=>joueurs.get(id)??0)))}));
      const libre=candidats.sort((a,b)=>a.debut-b.debut||a.terrain-b.terrain)[0];
      const fin=libre.debut+duree;
      dispos[libre.terrain-1]=fin;
      for(const id of [...m.joueurs1Ids??[m.equipe1Id],...m.joueurs2Ids??[m.equipe2Id]])joueurs.set(id,fin+repos);
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
