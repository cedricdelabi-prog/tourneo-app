"use client";
import {useEffect,useRef,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import TourneoNav from '@/components/TourneoNav';
import {supabase} from '@/lib/supabase';
import {normaliserOptionsV2} from '@/lib/options-v2';
import {nomParticipant} from '@/lib/rotation';
import {classementTournoi} from '@/lib/resultats';
import {heureCreneau,planifierMatchs} from '@/lib/planning';
import {appelTV,normaliserTV,pagesTV,statutMatchTV,TV_DEFAUT,type ReglagesTV} from '@/lib/ecran-tv';
import {tr,trModele,useLangue,localeFormat} from '@/lib/langue';
import type {Equipe,Match} from '@/types';
type TournoiTV={nom:string;equipes:Equipe[];matchs:Match[];valides:number[];format:string;options:ReturnType<typeof normaliserOptionsV2>};
export default function EcranTV({ecran=false}:{ecran?:boolean}){
 useLangue();const {id}=useParams<{id:string}>();
 const [tournoi,setTournoi]=useState<TournoiTV|null>(null),[erreur,setErreur]=useState(''),[maj,setMaj]=useState('');
 const [cle,setCle]=useState(''),[reglages,setReglages]=useState<ReglagesTV>(TV_DEFAUT),[page,setPage]=useState(0),[pleinEcranErreur,setPleinEcranErreur]=useState('');
 const reglagesRef=useRef(reglages);
 useEffect(()=>{let actif=true,enCours=false;async function charger(){if(enCours)return;enCours=true;try{
  const a=await supabase.auth.getUser();if(a.error||!a.data.user)throw Error('Connectez-vous avec le compte organisateur pour ouvrir cet écran.');
  const r=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',a.data.user.id).single();if(r.error||!r.data)throw Error('Impossible de charger ce tournoi. Vérifiez la connexion et le compte organisateur.');
  const d=typeof r.data.donnees==='string'?JSON.parse(r.data.donnees):r.data.donnees||{};
  if(!actif)return;setTournoi({nom:r.data.nom,equipes:d.equipes||[],matchs:d.matchs||[],valides:d.matchsValides||[],format:d.formatTournoi||'complet',options:normaliserOptionsV2(d.optionsV2)});setErreur('');setMaj(new Date().toLocaleTimeString(localeFormat()));setCle(`tourneo-tv-v1:${a.data.user.id}:${id}`);
 }catch(e){if(actif)setErreur(e instanceof Error?e.message:'Actualisation impossible.');}finally{enCours=false;}}
 void charger();const timer=setInterval(()=>void charger(),15000);return()=>{actif=false;clearInterval(timer);};},[id]);
 useEffect(()=>{if(!cle)return;function lire(){try{const v=normaliserTV(JSON.parse(localStorage.getItem(cle)||'null'));reglagesRef.current=v;setReglages(v);}catch{setErreur('Réglages locaux indisponibles. Gardez les fenêtres dans le même navigateur.');}}lire();function changement(e:StorageEvent){if(e.key===cle)lire();}window.addEventListener('storage',changement);return()=>window.removeEventListener('storage',changement);},[cle]);
 function modifier(p:Partial<ReglagesTV>){if(!cle)return;const v=normaliserTV({...reglagesRef.current,...p});try{localStorage.setItem(cle,JSON.stringify(v));reglagesRef.current=v;setReglages(v);}catch{setErreur('Réglages locaux indisponibles. Gardez les fenêtres dans le même navigateur.');}}
 useEffect(()=>{if(!reglages.defilement||reglages.pause)return;const timer=setInterval(()=>setPage(p=>p+1),reglages.secondes*1000);return()=>clearInterval(timer);},[reglages.defilement,reglages.pause,reglages.secondes]);
 const matchs=tournoi?.matchs||[],valides=tournoi?.valides||[],equipes=tournoi?.equipes||[];
 let planning:ReturnType<typeof planifierMatchs>=[];try{if(tournoi)planning=planifierMatchs(matchs,tournoi.options);}catch{/* Scores remain visible when the planning needs adjustment. */}
 const ordre=[...matchs].sort((a,b)=>(planning.find(p=>p.matchId===a.id)?.debut??a.ordre??a.id)-(planning.find(p=>p.matchId===b.id)?.debut??b.ordre??b.id));
 const attendus=ordre.filter(m=>statutMatchTV(m,valides)==='À jouer'),appel=appelTV(matchs,valides,reglages.appel);
 const classement=tournoi?classementTournoi(tournoi.format,equipes,matchs.filter(m=>valides.includes(m.id)),tournoi.options):[];
 const slides=[...(reglages.message?[{type:'annonce' as const}]:[]),...(appel?[{type:'appel' as const}]:[]),...pagesTV(ordre,4).map(lignes=>({type:'matchs' as const,lignes})),...pagesTV(classement).map(lignes=>({type:'classement' as const,lignes}))];
 const index=slides.length?page%slides.length:0,slide=slides[index];
 const nom=(m:Match,cote:1|2)=>nomParticipant(cote===1?m.equipe1Id:m.equipe2Id,equipes);
 async function pleinEcran(){try{await document.documentElement.requestFullscreen();setPleinEcranErreur('');}catch{setPleinEcranErreur('Utilisez F11 ou le mode plein écran de votre navigateur.');}}
 return <main className={ecran?'tourneo-tv':'v2-page'}>{!ecran&&<TourneoNav active="tournoi" backHref={`/tournoi/${id}`} backLabel="Retour au tournoi"/>}<div className={ecran?'tourneo-tv-shell':'v2-shell'}>
 {!ecran&&<section className="v2-card"><h1>{tr('Écran TV')}</h1><p>{tr('Une fenêtre pour le public, votre tournoi reste ouvert sur le PC.')}</p><a className="tourneo-tv-open" href={`/tournoi/${id}/tv?ecran=1`} target={`tourneo-tv-${id}`} rel="noopener">{tr('Ouvrir la fenêtre TV')}</a>
 <details><summary>{tr('Comment brancher le deuxième écran ?')}</summary><ol><li>{tr('Branchez la TV en HDMI et choisissez la bonne entrée sur la TV.')}</li><li>{tr('Sur Windows : appuyez sur Windows + P, puis choisissez Étendre. Sur Mac : Réglages Système → Moniteurs → utiliser comme écran étendu.')}</li><li>{tr('Ouvrez la fenêtre TV. Si elle apparaît en onglet, détachez cet onglet en le faisant glisser hors de Chrome.')}</li><li>{tr('Faites glisser la fenêtre vers la TV. Sur Windows, Windows + Maj + flèche gauche ou droite permet aussi de la déplacer.')}</li><li>{tr('Sur la TV, cliquez sur Plein écran. Gardez les commandes du tournoi sur votre PC.')}</li></ol><p>{tr('Utilisez le même profil Chrome pour les deux fenêtres. Ce mode pilote une TV reliée à ce PC ; il ne diffuse pas automatiquement vers une TV distante.')}</p></details>
 <div className="v2-form"><label>{tr('Temps par page')}<select value={reglages.secondes} disabled={!cle} onChange={e=>modifier({secondes:Number(e.target.value)})}>{[10,15,20,30,45,60].map(n=><option key={n} value={n}>{n} s</option>)}</select></label><label className="v2-check"><input type="checkbox" checked={reglages.defilement} disabled={!cle} onChange={e=>modifier({defilement:e.target.checked})}/>{tr('Défilement automatique')}</label>
 <label>{tr('Annonce au public')}<input maxLength={180} value={reglages.message} disabled={!cle} placeholder={tr('Ex. Reprise à 15 h 30')} onChange={e=>modifier({message:e.target.value})}/></label>
 <label className="v2-check"><input type="checkbox" checked={reglages.pause} disabled={!cle} onChange={e=>modifier({pause:e.target.checked})}/>{tr('Annoncer une pause du tournoi')}</label><p>{tr('La pause affiche une annonce sur la TV. Elle ne décale pas le planning ; ajustez-le séparément si nécessaire.')}</p>
 <label>{tr('Appeler un match sur la TV')}<select value={appel?.id??''} disabled={!cle} onChange={e=>modifier({appel:e.target.value?Number(e.target.value):null})}><option value="">{tr('Aucun appel')}</option>{attendus.map(m=><option key={m.id} value={m.id}>#{m.id} · {nom(m,1)} / {nom(m,2)}</option>)}</select></label><p>{tr('Seul le match choisi ici est appelé. Les autres rencontres sont affichées comme prévues.')}</p></div></section>}
 {ecran&&<header className="tourneo-tv-heading"><span className="tourneo-tv-brand"><img src="/tourneo-logo.png" alt="Tourneo" /></span><h1>{tournoi?.nom||tr('Écran TV')}</h1><button onClick={()=>void pleinEcran()}>{tr('Plein écran')}</button></header>}
 {erreur&&<p className="tourneo-tv-warning" role="alert">{tr(erreur)} {tournoi&&tr('Les dernières données reçues restent affichées.')}</p>}{pleinEcranErreur&&<p role="status">{tr(pleinEcranErreur)}</p>}
 {!tournoi&&!erreur&&<p role="status">{tr('Chargement…')}</p>}
 {tournoi&&<section className="tourneo-tv-board">
 {reglages.pause?<div className="tourneo-tv-annonce"><h2>{tr('Pause du tournoi')}</h2><p>{reglages.message||tr('Attendez l’annonce de reprise de l’organisateur.')}</p></div>:<>{slide?.type==='annonce'?<div className="tourneo-tv-annonce tourneo-tv-annonce-full" role="status"><h2>{tr('Information du tournoi')}</h2><p>{reglages.message}</p></div>:slide?.type==='appel'&&appel?<div className="tourneo-tv-call tourneo-tv-call-full"><strong>{tr('Prochain match : appel des joueurs')}</strong><h2>{nom(appel,1)} <span> / </span> {nom(appel,2)}</h2><p>{tr('Terrain')} {planning.find(p=>p.matchId===appel.id)?.terrain??appel.terrain??'—'} · #{appel.id}</p></div>:null}
 {slide?.type==='matchs'?<><h2>{tr('Matchs et résultats')}</h2><div className="tourneo-tv-matches">{slide.lignes.map(m=>{const c=planning.find(p=>p.matchId===m.id);return <article key={m.id}><small>#{m.id} · {tr('Terrain')} {c?.terrain??m.terrain??'—'} · {tr(statutMatchTV(m,valides))}</small><div><span>{nom(m,1)}</span><strong>{m.score1!==''&&m.score2!==''?`${m.score1} – ${m.score2}`:'—'}</strong><span>{nom(m,2)}</span></div>{c&&statutMatchTV(m,valides)==='À jouer'&&<small>{tr('Horaire prévisionnel')} : {heureCreneau(c.debut,tournoi.options.depart)}</small>}</article>;})}</div></>:slide?.type==='classement'?<><h2>{tr('Classement provisoire · résultats validés')}</h2><div className="tourneo-tv-ranking">{slide.lignes.map(l=><article key={l.equipe.id}><strong>{classement.indexOf(l)+1}</strong><span>{l.equipe.nom}</span><strong>{l.pts} {tr('Points')}</strong></article>)}</div></>:slide?.type==='annonce'||slide?.type==='appel'?null:<p>{tr('Aucune rencontre générée pour le moment.')}</p>}
 </>}
 <footer><span>{trModele('Page {0} / {1}',index+1,Math.max(1,slides.length))}</span><span>{tr('Dernière actualisation')} : {maj}</span>{!reglages.pause&&<div><button onClick={()=>setPage(p=>(p+Math.max(1,slides.length)-1)%Math.max(1,slides.length))}>{tr('Précédent')}</button><button onClick={()=>setPage(p=>p+1)}>{tr('Suivant')}</button></div>}</footer></section>}
 {!ecran&&<p><Link href={`/tournoi/${id}`}>{tr('Retour au tournoi')}</Link></p>}
 </div></main>;
}
