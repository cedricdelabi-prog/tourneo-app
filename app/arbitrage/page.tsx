"use client";
import {useEffect,useState}from'react';
import TourneoNav from '@/components/TourneoNav';
import{ supabase }from'@/lib/supabase';
import{erreurInscriptions}from'@/lib/inscriptions';
import{nomParticipant}from'@/lib/rotation';
import type{Equipe,Match}from'@/types';
type Arbitrage={id:string;nom:string;equipes:Equipe[];matchs:Match[];valides:number[];score?:string};
export default function MesArbitrages(){
 const[tournois,setTournois]=useState<Arbitrage[]>([]),[scores,setScores]=useState<Record<string,{score1:string;score2:string}>>({}),[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false);
 async function charger(){const auth=await supabase.auth.getUser();if(!auth.data.user){window.location.href='/login';return;}const r=await supabase.rpc('tourneo_mes_arbitrages');if(r.error)setMessage(erreurInscriptions(r.error.message));else{setTournois(r.data||[]);setMessage('');}}
 useEffect(()=>{void charger();},[]);
 async function envoyer(t:Arbitrage,m:Match){const s=scores[`${t.id}:${m.id}`];if(!s||!/^\d+$/.test(s.score1)||!/^\d+$/.test(s.score2)){setMessage('Saisissez deux scores entiers positifs ou nuls.');return;}setOccupe(true);const r=await supabase.rpc('tourneo_proposer_score',{p_tournoi:t.id,p_match:m.id,p_score1:Number(s.score1),p_score2:Number(s.score2)});setMessage(r.error?erreurInscriptions(r.error.message):'Résultat proposé à l’organisateur pour validation.');setOccupe(false);}
 return <main className="v2-page"><div className="v2-shell"><TourneoNav/><section className="v2-card"><h1>Mes arbitrages</h1>{message&&<p role="status">{message}</p>}<button disabled={occupe} onClick={charger}>Actualiser</button>{!tournois.length&&<p>L’organisateur peut vous ajouter comme arbitre avec votre code joueur Tourneo.</p>}</section>{tournois.map(t=><section className="v2-card" key={t.id}><h2>{t.nom}</h2>{t.score==='sets'?<p>L’organisateur saisit les manches et valide le résultat.</p>:(t.matchs||[]).filter(m=>!(t.valides||[]).includes(m.id)).map(m=>{const cle=`${t.id}:${m.id}`;const s=scores[cle]||{score1:'',score2:''};return <article key={m.id} className="v2-entry"><h3>{nomParticipant(m.equipe1Id,t.equipes||[])} — {nomParticipant(m.equipe2Id,t.equipes||[])}</h3><div className="v2-row">{(['score1','score2']as const).map((champ,i)=><label key={champ}>Score {i+1}<input type="number" min={0} max={1000000} value={s[champ]} onChange={e=>setScores(a=>({...a,[cle]:{...s,[champ]:e.target.value}}))}/></label>)}<button disabled={occupe} onClick={()=>envoyer(t,m)}>Proposer le résultat</button></div></article>})}</section>)}</div></main>;
}
