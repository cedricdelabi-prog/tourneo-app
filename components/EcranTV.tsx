"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import TourneoNav from '@/components/TourneoNav';
import {supabase} from '@/lib/supabase';
import {normaliserOptionsV2} from '@/lib/options-v2';
import {normaliserIdentiteAffiche} from '@/lib/modeles-affiche';
import {nomParticipant} from '@/lib/rotation';
import {classementTournoi} from '@/lib/resultats';
import {heureCreneau,planifierMatchs} from '@/lib/planning';
import {appelTV,compteAReboursTV,etatConnexionTV,filtrerMatchsTV,normaliserTV,pageCouranteTV,pagesTV,repriseSonoreDansDelai,statistiquesTV,statutMatchTV,TV_DEFAUT,type EtatConnexionTV,type ReglagesTV} from '@/lib/ecran-tv';
import {tr,trModele,useLangue,localeFormat} from '@/lib/langue';
import type {Equipe,Match} from '@/types';
type TournoiTV={nom:string;equipes:Equipe[];matchs:Match[];valides:number[];format:string;options:ReturnType<typeof normaliserOptionsV2>;sponsors:string[];logo:string};
export default function EcranTV({ecran=false}:{ecran?:boolean}){
 useLangue();const {id}=useParams<{id:string}>();
 const [tournoi,setTournoi]=useState<TournoiTV|null>(null),[erreur,setErreur]=useState(''),[maj,setMaj]=useState('');
 const [cle,setCle]=useState(''),[reglages,setReglages]=useState<ReglagesTV>(TV_DEFAUT),[pleinEcranErreur,setPleinEcranErreur]=useState(''),[etatTV,setEtatTV]=useState<EtatConnexionTV>('deconnecte');
 const reglagesRef=useRef(reglages);const cleRef=useRef('');const derniereReceptionRef=useRef(0);const [maintenant,setMaintenant]=useState(0);const [sponsorIndex,setSponsorIndex]=useState(0);const sonReprise=useRef(false);const audioRef=useRef<AudioContext|null>(null);const [audioActif,setAudioActif]=useState(false);
 useEffect(()=>{const actualiser=()=>setMaintenant(Date.now());actualiser();const timer=setInterval(actualiser,1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>()=>{const contexte=audioRef.current;audioRef.current=null;if(contexte)void contexte.close().catch(()=>{});},[]);
 useEffect(()=>{if(!ecran||!reglages.afficherSponsors)return;const timer=setInterval(()=>setSponsorIndex(i=>i+1),8000);return()=>clearInterval(timer);},[ecran,reglages.afficherSponsors]);
 useEffect(()=>{sonReprise.current=false;},[reglages.repriseA]);
 useEffect(()=>{if(!reglages.pause||!reglages.repriseA){sonReprise.current=false;return;}if(!repriseSonoreDansDelai(maintenant,reglages.repriseA)||sonReprise.current)return;if(!ecran)return;try{const contexte=audioRef.current;if(!contexte||contexte.state!=='running')return;const osc=contexte.createOscillator();const gain=contexte.createGain();osc.frequency.value=880;gain.gain.value=.08;osc.connect(gain);gain.connect(contexte.destination);osc.start();osc.stop(contexte.currentTime+.4);sonReprise.current=true;}catch{/* Audio may be unavailable on this device. */}},[maintenant,reglages.pause,reglages.repriseA,ecran]);
 useEffect(()=>{let actif=true,enCours=false;async function charger(){if(enCours)return;enCours=true;try{
  const a=await supabase.auth.getUser();if(a.error||!a.data.user)throw Error('Connectez-vous avec le compte organisateur pour ouvrir cet écran.');
  const r=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',a.data.user.id).single();if(r.error||!r.data)throw Error('Impossible de charger ce tournoi. Vérifiez la connexion et le compte organisateur.');
  const d=typeof r.data.donnees==='string'?JSON.parse(r.data.donnees):r.data.donnees||{};const identite=normaliserIdentiteAffiche(d.optionsV2?.identiteAffiche);
  if(!actif)return;setTournoi({nom:r.data.nom,equipes:d.equipes||[],matchs:d.matchs||[],valides:d.matchsValides||[],format:d.formatTournoi||'complet',options:normaliserOptionsV2(d.optionsV2),sponsors:identite.sponsors,logo:identite.logo});setErreur('');derniereReceptionRef.current=Date.now();setMaj(new Date().toLocaleTimeString(localeFormat()));const nouvelleCle=`tourneo-tv-v1:${a.data.user.id}:${id}`;cleRef.current=nouvelleCle;setCle(nouvelleCle);
 }catch(e){if(actif)setErreur(e instanceof Error?e.message:'Actualisation impossible.');}finally{enCours=false;}}
 void charger();const timer=setInterval(()=>void charger(),15000);
 const actualiserMaintenant=()=>void charger();
 const actualiserAutreFenetre=(ev:StorageEvent)=>{if(cleRef.current&&ev.key===`${cleRef.current}:rafraichir`)void charger();};
 window.addEventListener('tourneo-tv-rafraichir',actualiserMaintenant);
 window.addEventListener('storage',actualiserAutreFenetre);
 return()=>{actif=false;clearInterval(timer);window.removeEventListener('tourneo-tv-rafraichir',actualiserMaintenant);window.removeEventListener('storage',actualiserAutreFenetre);};},[id]);
 useEffect(()=>{if(!cle)return;function lire(){try{const v=normaliserTV(JSON.parse(localStorage.getItem(cle)||'null'));if(!v.debutDefilement){v.debutDefilement=Date.now();localStorage.setItem(cle,JSON.stringify(v));}reglagesRef.current=v;setReglages(v);}catch{setErreur('Réglages locaux indisponibles. Gardez les fenêtres dans le même navigateur.');}}lire();function changement(e:StorageEvent){if(e.key===cle)lire();}window.addEventListener('storage',changement);return()=>window.removeEventListener('storage',changement);},[cle]);
 useEffect(()=>{if(!cle||!ecran)return;
  const instance=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const signalCle=`${cle}:signal:${instance}`;
  const emettre=()=>{try{localStorage.setItem(signalCle,JSON.stringify({vuA:Date.now(),donneesA:derniereReceptionRef.current}));}catch{/* Local browser storage unavailable. */}};
  emettre();const timer=setInterval(emettre,5000);
  return()=>{clearInterval(timer);try{localStorage.removeItem(signalCle);}catch{/* Local browser storage unavailable. */}};
 },[cle,ecran]);
 useEffect(()=>{if(!cle||ecran)return;
  const prefix=`${cle}:signal:`;
  const inspecter=()=>{try{const signaux:unknown[]=[];
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;
    try{signaux.push(JSON.parse(localStorage.getItem(key)||'null'));}catch{/* Ignore malformed signals. */}
   }
   setEtatTV(etatConnexionTV(signaux,Date.now()));
  }catch{setEtatTV('deconnecte');}};
  inspecter();const timer=setInterval(inspecter,3000);
  const miseAJour=(ev:StorageEvent)=>{if(ev.key?.startsWith(prefix))inspecter();};
  window.addEventListener('storage',miseAJour);
  return()=>{clearInterval(timer);window.removeEventListener('storage',miseAJour);};
 },[cle,ecran]);
 function rafraichirEcrans(){if(!cle)return;
  try{localStorage.setItem(`${cle}:rafraichir`,String(Date.now()));}catch{/* Keep this window functional if local storage is full. */}
  window.dispatchEvent(new Event('tourneo-tv-rafraichir'));
 }
 function modifier(p:Partial<ReglagesTV>){if(!cle)return;const v=normaliserTV({...reglagesRef.current,...p});try{localStorage.setItem(cle,JSON.stringify(v));reglagesRef.current=v;setReglages(v);}catch{setErreur('Réglages locaux indisponibles. Gardez les fenêtres dans le même navigateur.');}}
 // The 1-second countdown must not regenerate tournament planning and ranking.
 const donnees=useMemo(()=>{
  const matchs=tournoi?.matchs||[],valides=tournoi?.valides||[],equipes=tournoi?.equipes||[];
  let planning:ReturnType<typeof planifierMatchs>=[];
  try{if(tournoi)planning=planifierMatchs(matchs,tournoi.options);}catch{/* Existing scores remain available if planning cannot be calculated. */}
  const debuts=new Map(planning.map(p=>[p.matchId,p.debut]));
  const ordre=[...matchs].sort((a,b)=>(debuts.get(a.id)??a.ordre??a.id)-(debuts.get(b.id)??b.ordre??b.id));
  const classement=tournoi?classementTournoi(tournoi.format,equipes,matchs.filter(m=>valides.includes(m.id)),tournoi.options):[];
  return {matchs,valides,equipes,planning,ordre,classement,statistiques:statistiquesTV(matchs,valides)};
 },[tournoi]);
 const {matchs,valides,equipes,planning,ordre,classement,statistiques}=donnees;
 const matchsDiffuses=useMemo(()=>filtrerMatchsTV(ordre,valides,reglages.filtreMatchs),[ordre,valides,reglages.filtreMatchs]);
 const attendus=useMemo(()=>ordre.filter(m=>statutMatchTV(m,valides)==='À jouer'),[ordre,valides]);
 const appel=appelTV(matchs,valides,reglages.appel);
 const slides=useMemo(()=>[...(reglages.message?[{type:'annonce' as const}]:[]),...(appel?[{type:'appel' as const}]:[]),...(reglages.afficherSponsors&&reglages.pageSponsors&&tournoi?.sponsors.length?[{type:'sponsors' as const}]:[]),...(reglages.afficherMatchs?pagesTV(matchsDiffuses,3).map(lignes=>({type:'matchs' as const,lignes})):[]),...(reglages.afficherClassement?pagesTV(classement).map(lignes=>({type:'classement' as const,lignes})):[])],[reglages.message,reglages.afficherSponsors,reglages.pageSponsors,reglages.afficherMatchs,reglages.afficherClassement,tournoi?.sponsors.length,appel,matchsDiffuses,classement]);
 const tempsRestant=compteAReboursTV(maintenant,reglages.repriseA);
 const position=pageCouranteTV(reglages,maintenant);const index=slides.length?((position%slides.length)+slides.length)%slides.length:0,slide=slides[index];
 const nom=(m:Match,cote:1|2)=>nomParticipant(cote===1?m.equipe1Id:m.equipe2Id,equipes);
 async function activerSon(){try{const contexte=audioRef.current??new AudioContext();audioRef.current=contexte;await contexte.resume();setAudioActif(contexte.state==='running');if(contexte.state==='running'){const osc=contexte.createOscillator();const gain=contexte.createGain();osc.frequency.value=660;gain.gain.value=.06;osc.connect(gain);gain.connect(contexte.destination);osc.start();osc.stop(contexte.currentTime+.15);setPleinEcranErreur('Son activé : une courte tonalité de test doit être audible.');}}catch{setAudioActif(false);setPleinEcranErreur('Le navigateur bloque le son. Vérifiez les autorisations audio.');}}
 async function pleinEcran(){try{await document.documentElement.requestFullscreen();setPleinEcranErreur('');}catch{setPleinEcranErreur('Utilisez F11 ou le mode plein écran de votre navigateur.');}}
 return <main className={ecran?'tourneo-tv':'v2-page'}>{!ecran&&<TourneoNav active="tournoi" backHref={`/tournoi/${id}`} backLabel="Retour au tournoi"/>}<div className={ecran?'tourneo-tv-shell':'v2-shell'}>
 {!ecran&&<section className="v2-card"><h1>{tr('Écran TV')}</h1><p>{tr('Une fenêtre pour le public, votre tournoi reste ouvert sur le PC.')}</p><p><Link href={`/tournoi/${id}?etape=communication`}>{tr('Gérer le logo et les sponsors du tournoi')}</Link></p><a className="tourneo-tv-open" href={`/tournoi/${id}/tv?ecran=1`} target={`tourneo-tv-${id}`} rel="noopener">{tr('Ouvrir la fenêtre TV')}</a>
 <div className="tourneo-tv-signal" role="status" aria-live="polite" data-etat={etatTV}>
 <span className="tourneo-tv-signal-dot" aria-hidden="true"/>
 <div><strong>{etatTV==='connecte'?tr('Fenêtre TV active'):etatTV==='actualisationEnRetard'?tr('Fenêtre TV active · données à vérifier'):tr('Fenêtre TV non détectée')}</strong>
 <p>{etatTV==='connecte'?tr('La fenêtre de diffusion fonctionne dans ce navigateur. Le branchement physique HDMI n’est pas vérifié.'):etatTV==='actualisationEnRetard'?tr('La fenêtre est active, mais les données n’ont pas été actualisées récemment.'):tr('Ouvrez la fenêtre TV avec le même profil de navigateur pour établir la liaison.')}</p></div>
 </div>
 <button className="tourneo-tv-refresh-button" type="button" disabled={!cle} onClick={rafraichirEcrans}>{tr('Actualiser les écrans maintenant')}</button>
 <details><summary>{tr('Comment brancher le deuxième écran ?')}</summary><ol><li>{tr('Branchez la TV en HDMI et choisissez la bonne entrée sur la TV.')}</li><li>{tr('Sur Windows : appuyez sur Windows + P, puis choisissez Étendre. Sur Mac : Réglages Système → Moniteurs → utiliser comme écran étendu.')}</li><li>{tr('Ouvrez la fenêtre TV. Si elle apparaît en onglet, détachez cet onglet en le faisant glisser hors de Chrome.')}</li><li>{tr('Faites glisser la fenêtre vers la TV. Sur Windows, Windows + Maj + flèche gauche ou droite permet aussi de la déplacer.')}</li><li>{tr('Sur la TV, cliquez sur Plein écran. Gardez les commandes du tournoi sur votre PC.')}</li></ol><p>{tr('Utilisez le même profil Chrome pour les deux fenêtres. Ce mode pilote une TV reliée à ce PC ; il ne diffuse pas automatiquement vers une TV distante.')}</p></details>
 <div className="v2-form"><h2 className="tourneo-tv-settings-heading">{tr('Diffusion et navigation')}</h2><label>{tr('Temps par page')}<select value={reglages.secondes} disabled={!cle} onChange={e=>modifier({secondes:Number(e.target.value),pageManuelle:index,debutDefilement:Date.now()})}>{[10,15,20,30,45,60].map(n=><option key={n} value={n}>{n} s</option>)}</select></label><label className="v2-check"><input type="checkbox" checked={reglages.defilement} disabled={!cle} onChange={e=>modifier({defilement:e.target.checked,pageManuelle:index,debutDefilement:Date.now()})}/>{tr('Défilement automatique')}</label>
 <fieldset className="tourneo-tv-filter-settings"><legend>{tr('Pages à afficher au public')}</legend>
 <label className="v2-check"><input type="checkbox" checked={reglages.afficherMatchs} disabled={!cle} onChange={e=>modifier({afficherMatchs:e.target.checked,pageManuelle:0,debutDefilement:Date.now()})}/>{tr('Matchs et résultats')}</label>
 <label className="v2-check"><input type="checkbox" checked={reglages.afficherClassement} disabled={!cle} onChange={e=>modifier({afficherClassement:e.target.checked,pageManuelle:0,debutDefilement:Date.now()})}/>{tr('Classement provisoire')}</label>
 <label>{tr('Matchs à diffuser')}<select value={reglages.filtreMatchs} disabled={!cle||!reglages.afficherMatchs} onChange={e=>modifier({filtreMatchs:e.target.value as ReglagesTV['filtreMatchs'],pageManuelle:0,debutDefilement:Date.now()})}><option value="tous">{tr('Tous les matchs')}</option><option value="aJouer">{tr('Matchs à jouer')}</option><option value="aValider">{tr('Scores à valider')}</option><option value="valides">{tr('Résultats validés')}</option></select></label>
 </fieldset>
 <div className="tourneo-tv-dashboard" role="group" aria-label="État des rencontres">
 <article><strong>{statistiques.total}</strong><span>{tr('Matchs prévus')}</span></article>
 <article><strong>{statistiques.aJouer}</strong><span>{tr('À jouer')}</span></article>
 <article><strong>{statistiques.aValider}</strong><span>{tr('À valider')}</span></article>
 <article><strong>{statistiques.valides}</strong><span>{tr('Validés')}</span></article>
 </div>
 <p className="tourneo-tv-pilot-status" role="status">{reglages.pause?tr("Diffusion en pause"):reglages.defilement?tr("Diffusion automatique"):tr("Diffusion manuelle")} · {trModele("Page {0} / {1}",index+1,Math.max(1,slides.length))} · {slide?.type==="sponsors"?tr("Partenaires"):slide?.type==="matchs"?tr("Matchs et résultats"):slide?.type==="classement"?tr("Classement provisoire"):slide?.type==="appel"?tr("Appel des joueurs"):slide?.type==="annonce"?tr("Information du tournoi"):tr("Aucune page disponible")} · {tournoi?tournoi.nom:tr("Chargement…")}</p>
 <div className="tourneo-tv-page-controls" aria-label="Navigation des pages TV"><button type="button" disabled={!cle||slides.length<2} onClick={()=>modifier({pageManuelle:(index+Math.max(1,slides.length)-1)%Math.max(1,slides.length),defilement:false})}>{tr('Page précédente')}</button><button type="button" disabled={!cle||slides.length<2} onClick={()=>modifier({pageManuelle:(index+1)%Math.max(1,slides.length),defilement:false})}>{tr('Page suivante')}</button><button type="button" disabled={!cle||reglages.pause||!slides.some(p=>p.type==='matchs')} onClick={()=>modifier({defilement:false,pageManuelle:slides.findIndex(p=>p.type==='matchs')})}>{tr('Voir les matchs')}</button><button type="button" disabled={!cle||reglages.pause||!slides.some(p=>p.type==='classement')} onClick={()=>modifier({defilement:false,pageManuelle:slides.findIndex(p=>p.type==='classement')})}>{tr('Voir le classement')}</button></div>
 <h2 className="tourneo-tv-settings-heading">{tr('Messages et pauses')}</h2>
 <label>{tr('Annonce au public')}<input maxLength={180} value={reglages.message} disabled={!cle} placeholder={tr('Ex. Reprise à 15 h 30')} onChange={e=>modifier({message:e.target.value})}/></label>
 <div className="tourneo-tv-page-controls" aria-label="Annonces publiques">
 <button type="button" disabled={!cle||reglages.pause||!reglages.message.trim()} onClick={()=>modifier({defilement:false,pageManuelle:0})}>{tr('Diffuser l’annonce maintenant')}</button>
 <button type="button" disabled={!cle||reglages.pause||!reglages.message} onClick={()=>modifier({message:'',defilement:true,pageManuelle:0,debutDefilement:Date.now()})}>{tr("Retirer l’annonce et reprendre le défilement")}</button>
 </div>
 <div className="tourneo-tv-page-controls" aria-label="Messages rapides">
 <button type="button" disabled={!cle||reglages.pause} onClick={()=>modifier({message:'La buvette est ouverte. Retrouvez-nous à l’espace buvette.',defilement:false,pageManuelle:0})}>{tr('Annonce buvette')}</button>
 <button type="button" disabled={!cle||reglages.pause} onClick={()=>modifier({message:'La remise des prix approche. Merci de rejoindre la zone podium.',defilement:false,pageManuelle:0})}>{tr('Annonce remise des prix')}</button>
 <button type="button" disabled={!cle||reglages.pause} onClick={()=>modifier({message:'Les rencontres reprennent. Merci de rejoindre votre terrain.',defilement:false,pageManuelle:0})}>{tr('Annonce reprise des matchs')}</button>
 </div>
 <label className="v2-check"><input type="checkbox" checked={reglages.pause} disabled={!cle} onChange={e=>modifier({pause:e.target.checked,pageManuelle:index,debutDefilement:Date.now()})}/>{tr('Annoncer une pause du tournoi')}</label><p>{tr('La pause affiche une annonce sur la TV. Elle ne décale pas le planning ; ajustez-le séparément si nécessaire.')}</p>
 <div className="tourneo-tv-page-controls" aria-label="Commandes de pause"><button type="button" disabled={!cle} onClick={()=>modifier({pause:true,repriseA:Date.now()+10*60000,pageManuelle:index})}>{tr('Pause 10 min')}</button><button type="button" disabled={!cle} onClick={()=>modifier({pause:true,repriseA:Date.now()+15*60000,pageManuelle:index})}>{tr('Pause 15 min')}</button><button type="button" disabled={!cle} onClick={()=>modifier({pause:true,repriseA:Date.now()+30*60000,pageManuelle:index})}>{tr('Pause 30 min')}</button><button type="button" disabled={!cle||!reglages.pause} onClick={()=>modifier({pause:false,repriseA:null,message:'',pageManuelle:index,debutDefilement:Date.now()})}>{tr('Reprendre le tournoi')}</button></div>
 <label>{tr('Reprise prévue (heure locale)')}<input type="datetime-local" value={reglages.repriseA?new Date(reglages.repriseA-new Date(reglages.repriseA).getTimezoneOffset()*60000).toISOString().slice(0,16):''} disabled={!cle} onChange={e=>modifier({repriseA:e.target.value?new Date(e.target.value).getTime():null})}/></label>
 {reglages.pause&&<div className="tourneo-tv-pause-status">
 <strong>{reglages.repriseA?maintenant>=reglages.repriseA?tr('Reprise prévue atteinte'):tr('Temps restant avant la reprise'):tr('Pause sans heure de reprise')}</strong>
 {reglages.repriseA&&<span className="tourneo-tv-pause-timer" aria-live="off">{tempsRestant||'--:--:--'}</span>}
 <p>{tr('La fin du compte à rebours déclenche le signal sonore si celui-ci est activé. Le tournoi reprend uniquement lorsque l’organisateur clique sur Reprendre.')}</p>
 <div className="tourneo-tv-page-controls"><button type="button" disabled={!cle||!reglages.repriseA} onClick={()=>modifier({repriseA:Math.max(Date.now(),reglages.repriseA||0)+5*60000})}>{tr('Prolonger la pause de 5 min')}</button><button type="button" disabled={!cle||!reglages.repriseA||reglages.repriseA<=maintenant+60000} onClick={()=>modifier({repriseA:Math.max(Date.now()+60000,(reglages.repriseA||0)-5*60000)})}>{tr('Raccourcir de 5 min')}</button></div>
 </div>}
 <h2 className="tourneo-tv-settings-heading">{tr('Partenaires et visibilité')}</h2>
 <label className="v2-check"><input type="checkbox" checked={reglages.afficherSponsors} disabled={!cle} onChange={e=>modifier({afficherSponsors:e.target.checked})}/>{tr('Diffuser les sponsors sur la TV')}</label>
 <label className="v2-check"><input type="checkbox" checked={reglages.pageSponsors} disabled={!cle||!reglages.afficherSponsors||!tournoi?.sponsors.length} onChange={e=>modifier({pageSponsors:e.target.checked})}/>{tr("Ajouter une page dédiée aux sponsors dans le défilement TV")}</label>
 <div className="tourneo-tv-page-controls" aria-label="Mise en avant des partenaires"><button type="button" disabled={!cle||reglages.pause||!tournoi?.sponsors.length} onClick={()=>modifier({afficherSponsors:true,pageSponsors:true,defilement:false,pageManuelle:(reglages.message?1:0)+(appel?1:0)})}>{tr('Afficher les sponsors maintenant')}</button><button type="button" disabled={!cle||reglages.pause||!slides.some(p=>p.type==='matchs'||p.type==='classement')} onClick={()=>modifier({defilement:false,pageManuelle:slides.findIndex(p=>p.type==='matchs'||p.type==='classement')})}>{tr('Revenir aux résultats')}</button></div>

 <h2 className="tourneo-tv-settings-heading">{tr('Appel des joueurs')}</h2>
 <label>{tr('Appeler un match sur la TV')}<select value={appel?.id??''} disabled={!cle} onChange={e=>modifier({appel:e.target.value?Number(e.target.value):null})}><option value="">{tr('Aucun appel')}</option>{attendus.map(m=><option key={m.id} value={m.id}>#{m.id} · {nom(m,1)} / {nom(m,2)}</option>)}</select></label><p>{tr('Seul le match choisi ici est appelé. Les autres rencontres sont affichées comme prévues.')}</p>
 {attendus.length>0&&<div className="tourneo-tv-next"><h3>{tr('Prochains matchs à jouer')}</h3><ol>{attendus.slice(0,4).map(m=>{const c=planning.find(p=>p.matchId===m.id);return <li key={m.id}><span>{nom(m,1)} / {nom(m,2)}</span><small>#{m.id} · {tr('Terrain')} {c?.terrain??m.terrain??'—'}{c?` · ${heureCreneau(c.debut,tournoi?.options.depart||'')}`:''}</small></li>;})}</ol></div>}</div></section>}
 {ecran&&<header className="tourneo-tv-heading"><span className="tourneo-tv-brand tourneo-tv-brand-logo" aria-label="Logo Tourneo"><img src={tournoi?.logo||"/tourneo-icon.png"} alt={tournoi?.logo?tr("Logo du tournoi"):"Logo Tourneo"} width={88} height={88}/></span><h1>{tournoi?.nom||tr('Écran TV')}</h1><button onClick={()=>void activerSon()}>{audioActif?tr('Tester le son'):tr('Activer le son de reprise')}</button><button onClick={()=>void pleinEcran()}>{tr('Plein écran')}</button></header>}
 {ecran&&derniereReceptionRef.current>0&&maintenant-derniereReceptionRef.current>45000&&<p className="tourneo-tv-warning" role="alert">{tr('Connexion aux données interrompue : les derniers résultats reçus restent visibles. Vérifiez le réseau.')}</p>}
 {erreur&&<p className="tourneo-tv-warning" role="alert">{tr(erreur)} {tournoi&&tr('Les dernières données reçues restent affichées.')}</p>}{pleinEcranErreur&&<p role="status">{tr(pleinEcranErreur)}</p>}
 {!tournoi&&!erreur&&<p role="status">{tr('Chargement…')}</p>}
 {tournoi&&<section className="tourneo-tv-board">
 {reglages.pause?<div className="tourneo-tv-annonce"><h2>{tr('Pause du tournoi')}</h2><p>{reglages.message||tr('Attendez l’annonce de reprise de l’organisateur.')}</p><small className="tourneo-tv-pause-explainer">{tr('Le tableau des matchs sera réaffiché lorsque l’organisateur confirmera la reprise.')}</small>{reglages.repriseA&&<div className="tourneo-tv-countdown" role="timer"><small>{tr('Reprise prévue')} : {new Date(reglages.repriseA).toLocaleTimeString(localeFormat(),{hour:'2-digit',minute:'2-digit'})}</small><strong>{maintenant>=reglages.repriseA?tr('Reprise annoncée · en attente de l’organisateur'):tempsRestant||'--:--:--'}</strong></div>}</div>:<>{slide?.type==='annonce'?<div className="tourneo-tv-annonce tourneo-tv-annonce-full" role="status"><h2>{tr('Information du tournoi')}</h2><p>{reglages.message}</p></div>:slide?.type==='appel'&&appel?<div className="tourneo-tv-call tourneo-tv-call-full"><strong>{tr('Prochain match : appel des joueurs')}</strong><h2>{nom(appel,1)} <span> / </span> {nom(appel,2)}</h2><p>{tr('Terrain')} {planning.find(p=>p.matchId===appel.id)?.terrain??appel.terrain??'—'} · #{appel.id}</p></div>:null}
 {slide?.type==='sponsors'?<div className="tourneo-tv-sponsor-slide"><h2>{tr('Nos partenaires')}</h2><div>{tournoi.sponsors.map((src,i)=><img key={i} src={src} alt={`${tr('Sponsor')} ${i+1}`}/>)}</div></div>:null}
 {slide?.type==='matchs'?<><h2>{tr('Matchs et résultats')}</h2><div className="tourneo-tv-matches">{slide.lignes.map(m=>{const c=planning.find(p=>p.matchId===m.id);return <article key={m.id}><small>#{m.id} · {tr('Terrain')} {c?.terrain??m.terrain??'—'} · {tr(statutMatchTV(m,valides))}</small><div><span>{nom(m,1)}</span><strong>{m.score1!==''&&m.score2!==''?`${m.score1} – ${m.score2}`:'—'}</strong><span>{nom(m,2)}</span></div>{c&&statutMatchTV(m,valides)==='À jouer'&&<small>{tr('Horaire prévisionnel')} : {heureCreneau(c.debut,tournoi.options.depart)}</small>}</article>;})}</div></>:slide?.type==='classement'?<><h2>{tr('Classement provisoire · résultats validés')}</h2><div className="tourneo-tv-ranking">{slide.lignes.map(l=><article key={l.equipe.id}><strong>{classement.indexOf(l)+1}</strong><span>{l.equipe.nom}</span><strong>{l.pts} {tr('Points')}</strong></article>)}</div></>:slide?null:<p>{tr('Aucune rencontre générée pour le moment.')}</p>}
 </>}
 <footer><span>{trModele('Page {0} / {1}',index+1,Math.max(1,slides.length))}</span><span>{tr('Dernière actualisation')} : {maj}</span>{!ecran&&!reglages.pause&&<div><button onClick={()=>modifier({pageManuelle:(index+Math.max(1,slides.length)-1)%Math.max(1,slides.length),defilement:false})}>{tr('Précédent')}</button><button onClick={()=>modifier({pageManuelle:(index+1)%Math.max(1,slides.length),defilement:false})}>{tr('Suivant')}</button></div>}</footer></section>}
 {!ecran&&<p><Link href={`/tournoi/${id}`}>{tr('Retour au tournoi')}</Link></p>}
 {ecran&&reglages.afficherSponsors&&slide?.type!=='sponsors'&&Boolean(tournoi?.sponsors.length)&&<aside className="tourneo-tv-sponsors-bottom" aria-label="Sponsors du tournoi"><strong>{tr('Nos partenaires')}</strong><div>{tournoi?.sponsors.length?Array.from({length:Math.min(2,tournoi.sponsors.length)},(_,i)=>{const index=(sponsorIndex*2+i)%tournoi.sponsors.length;return <img key={index} src={tournoi.sponsors[index]} alt={`${tr('Sponsor')} ${index+1}`}/>;}):null}</div></aside>}
 </div></main>;
}
