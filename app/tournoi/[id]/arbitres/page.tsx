"use client";
import {useEffect,useState}from'react';
import {useParams}from'next/navigation';
import {supabase}from'@/lib/supabase';
import {tr,useLangue}from'@/lib/langue';
import TourneoNav from'@/components/TourneoNav';
import ArbitresTournoi from'@/components/ArbitresTournoi';
import type{Equipe,Match}from'@/types';
export default function PreparationArbitres(){useLangue();const{id}=useParams<{id:string}>(),[nom,setNom]=useState(''),[donnees,setDonnees]=useState<{equipes:Equipe[];matchs:Match[];matchsValides:number[]}|null>(null),[erreur,setErreur]=useState('');useEffect(()=>{let actif=true;void(async()=>{const a=await supabase.auth.getUser();if(!a.data.user){location.href='/login';return;}const r=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',a.data.user.id).single();if(!actif)return;if(r.error||!r.data){setErreur('Tournoi introuvable ou accès organisateur requis.');return;}setNom(r.data.nom);setDonnees({equipes:r.data.donnees.equipes||[],matchs:r.data.donnees.matchs||[],matchsValides:r.data.donnees.matchsValides||[]});})().catch(()=>{if(actif)setErreur('Chargement impossible. Réessayez.');});return()=>{actif=false;};},[id]);return <main className="v2-page"><div className="v2-shell"><TourneoNav active="tournoi" backHref={`/tournoi/${id}`} backLabel="Retour au tournoi"/><h1>{tr('Désigner les arbitres')} · {nom}</h1><p>{tr('Vous pouvez les ajouter avant le démarrage ou pendant le tournoi. Ils ont accès aux matchs de ce tournoi ; vous gardez la validation finale.')}</p>{erreur&&<p role="alert">{tr(erreur)}</p>}{donnees&&<ArbitresTournoi id={id} equipes={donnees.equipes} matchs={donnees.matchs} valides={donnees.matchsValides} preparation onImporter={()=>{}}/>}</div></main>;}
