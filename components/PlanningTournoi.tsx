"use client";
import { useState } from 'react';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
import { nomParticipant } from "@/lib/rotation";
import { planifierMatchs, heureCreneau } from '@/lib/planning';
export default function PlanningTournoi({equipes,matchs,options,onChange}:{equipes:Equipe[];matchs:Match[];options:OptionsV2;onChange:(m:Match[])=>void}){
  const [message,setMessage]=useState('');const [glisse,setGlisse]=useState<number|null>(null);
  const planning=planifierMatchs(matchs,options);
  const nom=(id:string)=>nomParticipant(id,equipes);
  function deplacer(id:number,cible:number){
    const a=matchs.find(m=>m.id===id),b=matchs.find(m=>m.id===cible);
    if(!a||!b||a.journee!==b.journee||id===cible)return;
    const tour=matchs.filter(m=>m.journee===a.journee).sort((a,b)=>(a.ordre??a.id)-(b.ordre??b.id));
    tour.splice(tour.findIndex(m=>m.id===id),1);tour.splice(tour.findIndex(m=>m.id===cible),0,a);
    const ordre=new Map(tour.map((m,i)=>[m.id,i]));
    onChange(matchs.map(m=>ordre.has(m.id)?{...m,ordre:ordre.get(m.id)}:m));
  }
  function appeler(m:Match,terrain:number){
    const texte=`Match sur le terrain ${terrain} : ${nom(m.equipe1Id)} contre ${nom(m.equipe2Id)}.`;
    setMessage(texte);
  }
  return <section className="v2-planning"><h2>Planning des terrains</h2><p>Estimation : {planning.length?Math.max(...planning.map(c=>c.fin)):0} minutes · {options.terrains} terrain(s). Déplacez les lignes au sein d’une même ronde, ou utilisez les flèches. Les temps de repos sont conservés.</p>
    {message&&<p role="status">{message}</p>}<div style={{overflowX:'auto'}}><table><thead><tr><th>Tour</th><th>Début estimé</th><th>Terrain</th><th>Rencontre</th><th className="v2-no-print">Ordre / appel</th></tr></thead><tbody>{planning.map((c,i)=>{const m=matchs.find(m=>m.id===c.matchId)!;const avant=planning[i-1],apres=planning[i+1];return <tr key={m.id} draggable onDragStart={()=>setGlisse(m.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(glisse!==null)deplacer(glisse,m.id);setGlisse(null);}}><td>{m.journee}</td><td>{heureCreneau(c.debut,options.depart)}</td><td>{c.terrain}</td><td>{nom(m.equipe1Id)} — {nom(m.equipe2Id)}</td><td className="v2-no-print"><button type="button" aria-label="Avancer le match" disabled={!avant||avant.journee!==m.journee} onClick={()=>deplacer(m.id,avant.matchId)}>↑</button><button type="button" aria-label="Reculer le match" disabled={!apres||apres.journee!==m.journee} onClick={()=>deplacer(apres.matchId,m.id)}>↓</button><button type="button" onClick={()=>appeler(m,c.terrain)}>Appeler</button></td></tr>})}</tbody></table></div>
    <p>Les horaires réels dépendent de la durée des rencontres. Les appels s’affichent sur cet appareil.</p></section>;
}
