"use client";
import { useEffect,useMemo,useState } from 'react';
import TourneoBrand from '@/components/TourneoBrand';
import { supabase } from '@/lib/supabase';
import { erreurInscriptions } from '@/lib/inscriptions';
import { classementTournoi,tournoiEstTermine,pointsPalmares } from '@/lib/resultats';
import type { Equipe,Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
type Tournoi={id:string;nom:string;sport:string;donnees:{equipes?:Equipe[];matchs?:Match[];formatTournoi?:string;optionsV2?:OptionsV2;matchsValides?:number[]}};
type Evenement={id:string;nom:string};
export default function Evenements(){
  const [evenements,setEvenements]=useState<Evenement[]>([]),[tournois,setTournois]=useState<Tournoi[]>([]),[liens,setLiens]=useState<{evenement_id:string;tournoi_id:string}[]>([]);
  const [selection,setSelection]=useState(''),[nom,setNom]=useState(''),[user,setUser]=useState(''),[erreur,setErreur]=useState(''),[occupe,setOccupe]=useState(false);
  async function charger(){
    const {data}=await supabase.auth.getUser();if(!data.user){window.location.href='/login';return;}setUser(data.user.id);
    const [ev,ts,ls]=await Promise.all([supabase.from('tourneo_evenements').select('id,nom').eq('user_id',data.user.id).order('created_at',{ascending:false}),supabase.from('tournois').select('id,nom,sport,donnees').eq('user_id',data.user.id),supabase.from('tourneo_evenement_tournois').select('*')]);
    if(ev.error||ts.error||ls.error){setErreur(erreurInscriptions((ev.error||ts.error||ls.error)!.message));return;}
    setEvenements(ev.data||[]);setTournois(ts.data||[]);setLiens(ls.data||[]);setSelection(v=>v||ev.data?.[0]?.id||'');setErreur('');
  }
  useEffect(()=>{void charger();},[]);
  async function creer(e:React.FormEvent){e.preventDefault();setOccupe(true);const r=await supabase.from('tourneo_evenements').insert({nom:nom.trim(),user_id:user}).select('id').single();if(r.error)setErreur(erreurInscriptions(r.error.message));else{setNom('');setSelection(r.data.id);await charger();}setOccupe(false);}
  async function lier(tournoi:string,actif:boolean){setOccupe(true);const r=actif?await supabase.from('tourneo_evenement_tournois').insert({evenement_id:selection,tournoi_id:tournoi}):await supabase.from('tourneo_evenement_tournois').delete().eq('evenement_id',selection).eq('tournoi_id',tournoi);if(r.error)setErreur(erreurInscriptions(r.error.message));else await charger();setOccupe(false);}
  const retenus=tournois.filter(t=>liens.some(l=>l.evenement_id===selection&&l.tournoi_id===t.id));
  const classement=useMemo(()=>{
    const scores=new Map<string,{nom:string;points:number;participations:number;victoires:number}>();
    for(const t of retenus){const d=t.donnees||{},equipes=d.equipes||[],matchs=d.matchs||[],format=d.formatTournoi||'complet';if(!tournoiEstTermine(format,equipes,matchs,d.optionsV2,d.matchsValides))continue;
      classementTournoi(format,equipes,matchs,d.optionsV2).forEach((l,i)=>{const cle=l.equipe.profilId??l.equipe.id;const ligne=scores.get(cle)||{nom:l.equipe.nom,points:0,participations:0,victoires:0};ligne.points+=pointsPalmares(i+1);ligne.participations++;if(i===0)ligne.victoires++;scores.set(cle,ligne);});}
    return [...scores].map(([id,l])=>({id,...l})).sort((a,b)=>b.points-a.points||b.victoires-a.victoires||a.nom.localeCompare(b.nom));
  },[retenus]);
  return <main className="v2-page"><div className="v2-shell"><TourneoBrand/><p><a href="/dashboard">← Mes tournois</a></p><section className="v2-card"><h1>Événements et animations</h1><p>Regroupez plusieurs tournois pour suivre un programme de camping, une journée de club ou une compétition sur plusieurs disciplines.</p>{erreur&&<p role="alert" className="v2-alert">{erreur}</p>}<form className="v2-form" onSubmit={creer}><label>Nouvel événement<input maxLength={100} required value={nom} onChange={e=>setNom(e.target.value)}/></label><button disabled={occupe||!user}>Créer l’événement</button></form><label>Événement<select value={selection} onChange={e=>setSelection(e.target.value)}><option value="">Choisir…</option>{evenements.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}</select></label></section>
    {selection&&<><section className="v2-card"><h2>Programme et tournois</h2>{tournois.map(t=><label key={t.id} className="v2-check"><input type="checkbox" disabled={occupe} checked={retenus.some(r=>r.id===t.id)} onChange={e=>lier(t.id,e.target.checked)}/>{t.nom} · {t.sport}<a href={`/tournoi/${t.id}`}>Ouvrir</a></label>)}<p><a href="/tournoi/nouveau">Ajouter un nouveau tournoi au programme</a></p><button onClick={()=>window.print()}>Imprimer le programme et le classement</button></section><section className="v2-card"><h2>Classement cumulé</h2><p>Seuls les tournois terminés comptent. Les profils Tourneo conservent leur identité entre tournois. Barème : 100 points au premier, 70 au deuxième, 50 du troisième au quatrième, 30 du cinquième au huitième, puis 10.</p>{classement.map((l,i)=><p key={l.id}><strong>{i+1}. {l.nom}</strong> · {l.points} points · {l.participations} tournoi(s) · {l.victoires} victoire(s)</p>)}{!classement.length&&<p>Le classement apparaîtra après un premier tournoi terminé.</p>}</section></>}
  </div></main>;
}
