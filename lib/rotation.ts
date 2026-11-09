import type { Equipe,Match } from '@/types';
/** Round-robin partner rotation. Four players per match; any idle players rotate. */
export function genererPartenairesTournants(equipes:Equipe[],rondes:number):Match[]{
 if(equipes.length<4||!Number.isInteger(rondes)||rondes<1||rondes>32)throw new Error('Prévoyez au moins quatre joueurs et entre 1 et 32 rondes');
 const ids=equipes.map(e=>e.id),repos=new Map(ids.map(id=>[id,0])),partenaires=new Map<string,number>();const resultat:Match[]=[];
 const cle=(a:string,b:string)=>[a,b].sort().join('|');
 for(let ronde=1;ronde<=rondes;ronde++){
   // Select least-rested participants for the next byes, rotating ties by round.
   const ordre=[...ids.slice((ronde-1)%ids.length),...ids.slice(0,(ronde-1)%ids.length)].sort((a,b)=>(repos.get(a)??0)-(repos.get(b)??0));
   const inactifs=ordre.slice(0,ids.length%4);for(const id of inactifs)repos.set(id,(repos.get(id)??0)+1);
   const disponibles=ordre.filter(id=>!inactifs.includes(id));const duos:string[][]=[];
   while(disponibles.length){const a=disponibles.shift()!;disponibles.sort((b,c)=>(partenaires.get(cle(a,b))??0)-(partenaires.get(cle(a,c))??0));const b=disponibles.shift()!;duos.push([a,b]);partenaires.set(cle(a,b),(partenaires.get(cle(a,b))??0)+1);}
   for(let i=0;i<duos.length;i+=2){const a=duos[i],b=duos[i+1];resultat.push({id:ronde*1000+i/2+1,journee:ronde,equipe1Id:'duo:'+a.join('|'),equipe2Id:'duo:'+b.join('|'),joueurs1Ids:a,joueurs2Ids:b,score1:'',score2:''});}
 }
 return resultat;
}
export function nomParticipant(id:string,equipes:Pick<Equipe,'id'|'nom'>[]){
 const direct=equipes.find(e=>e.id===id);if(direct)return direct.nom;
 if(id.startsWith('duo:'))return id.slice(4).split('|').map(j=>equipes.find(e=>e.id===j)?.nom??'Joueur').join(' / ');
 return 'Participant';
}
