"use client";
import { useEffect,useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { nomParticipant } from "@/lib/rotation";
import { classementTournoi } from '@/lib/resultats';
import { normaliserOptionsV2 } from '@/lib/options-v2';
import { planifierMatchs,heureCreneau } from '@/lib/planning';
import type { Equipe,Match } from '@/types';
type Contenu={nomTournoi:string;equipes:Equipe[];matchs:Match[];formatTournoi:string;optionsV2?:Parameters<typeof normaliserOptionsV2>[0]};
export default function FeuilleTournoi(){
  const {id}=useParams<{id:string}>();const [contenu,setContenu]=useState<Contenu|null>(null),[vierge,setVierge]=useState(false),[erreur,setErreur]=useState(''),[lien,setLien]=useState('');
  useEffect(()=>{setLien(`${window.location.origin}/partage/${id}`);async function charger(){let local=false;try{const brut=localStorage.getItem(`tourneo-v04:${id}`);if(brut){const d=JSON.parse(brut);if(d.tournoiId===id){setContenu(d);local=true;}}}catch{}if(local)return;const {data:auth}=await supabase.auth.getUser();if(!auth.user){setErreur('Ouvrez le tournoi depuis votre compte avant d’imprimer.');return;}const {data,error}=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',auth.user.id).single();if(error)setErreur(error.message);else setContenu({...data.donnees,nomTournoi:data.nom});}void charger();},[id]);
  const options=normaliserOptionsV2(contenu?.optionsV2);const equipes=contenu?.equipes||[],matchs=contenu?.matchs||[];const planning=planifierMatchs(matchs,options);const classement=classementTournoi(contenu?.formatTournoi||'complet',equipes,matchs,options);
  const nom=(id:string)=>nomParticipant(id,equipes);
  return <main className="v2-paper"><div className="v2-paper-actions"><a href={`/tournoi/${id}`}>← Tournoi</a><button onClick={()=>window.print()} disabled={!contenu}>Imprimer / Enregistrer en PDF</button><label><input type="checkbox" checked={vierge} onChange={e=>setVierge(e.target.checked)}/>Feuilles de scores vierges</label></div><h1>{contenu?.nomTournoi||'Tourneo'}</h1>{erreur&&<p role="alert">{erreur}</p>}<p>{equipes.length} participants · {matchs.length} matchs · {options.terrains} terrain(s)</p>{lien&&<div className="v2-paper-qr"><QRCodeSVG value={lien} size={100} marginSize={4}/><small>Résultats en direct : {lien}</small></div>}<h2>Planning et feuilles de match</h2><table><thead><tr><th>Tour</th><th>Heure estimée</th><th>Terrain</th><th>Participant 1</th><th>Score</th><th>Participant 2</th><th>Visa</th></tr></thead><tbody>{planning.map(c=>{const m=matchs.find(m=>m.id===c.matchId)!;return <tr key={m.id}><td>{m.journee}</td><td>{heureCreneau(c.debut,options.depart)}</td><td>{c.terrain}</td><td>{nom(m.equipe1Id)}</td><td>{vierge?'___ – ___':`${m.score1||'___'} – ${m.score2||'___'}`}</td><td>{nom(m.equipe2Id)}</td><td>________</td></tr>})}</tbody></table><h2>{vierge?'Participants et pointage':'Classement provisoire / final selon l’avancement'}</h2><table><thead><tr><th>#</th><th>Participant</th><th>{vierge?'Présence':'Matchs'}</th><th>{vierge?'Notes':'Points'}</th></tr></thead><tbody>{classement.map((l,i)=><tr key={l.equipe.id}><td>{i+1}</td><td>{l.equipe.nom}</td><td>{vierge?'☐':l.mj}</td><td>{vierge?'________________':l.pts}</td></tr>)}</tbody></table><p>Les décisions de l’organisateur et de l’arbitre prévalent. Reportez les résultats papier dans Tourneo au retour de la connexion.</p></main>;
}
