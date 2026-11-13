"use client";
import { useEffect, useState } from 'react';
import TourneoNav from '@/components/TourneoNav';
import { supabase } from '@/lib/supabase';
import { tr, useLangue } from '@/lib/langue';
type Rencontre={id:number;journee:number;terrain?:number;participant1:string;participant2:string;score1?:string;score2?:string;valide:boolean};
type Participation={id:string;nom:string;matchs:Rencontre[]};
export default function MesMatchs(){
 useLangue();const [tournois,setTournois]=useState<Participation[]>([]),[message,setMessage]=useState(''),[pret,setPret]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let actif=true;void(async()=>{const a=await supabase.auth.getUser();if(!a.data.user){window.location.assign('/login');return;}const r=await supabase.rpc('tourneo_mes_participations');if(!actif)return;if(r.error)setMessage('Impossible de charger vos matchs. Réessayez.');else{setTournois(r.data||[]);setMessage('');}setPret(true);})().catch(()=>{if(actif){setMessage('Impossible de charger vos matchs. Réessayez.');setPret(true);}});return()=>{actif=false;};},[revision]);
 return <main className="v2-page"><div className="v2-shell"><TourneoNav/><section className="v2-card"><span className="v2-eyebrow">{tr('Espace joueur')}</span><h1>{tr('Mes matchs')}</h1><p>{tr('Vos rencontres et vos résultats validés, sans les réglages du tournoi.')}</p><button type="button" onClick={()=>setRevision(v=>v+1)}>{tr('Actualiser')}</button>{message&&<p role="status">{tr(message)}</p>}{!pret&&<p>{tr('Chargement…')}</p>}{pret&&!tournois.length&&!message&&<p>{tr('Aucun match lié à votre profil. Donnez votre code joueur à l’organisateur.')}</p>}</section>{tournois.map(t=><section className="v2-card" key={t.id}><h2>{t.nom}</h2><div className="tourneo-player-matches">{t.matchs.map(m=><article className="v2-entry" key={m.id}><small>{tr('Tour')} {m.journee}{m.terrain?` · ${tr('Terrain')} ${m.terrain}`:''}</small><h3>{m.participant1} — {m.participant2}</h3><p>{m.valide?`${m.score1} – ${m.score2} · ${tr('Validé par l’organisateur')}`:tr('À jouer · résultat non validé')}</p></article>)}</div></section>)}</div></main>;
}
