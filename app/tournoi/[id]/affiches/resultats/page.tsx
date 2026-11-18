"use client";
import {useEffect,useMemo,useState} from 'react';
import {useParams} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import TourneoRetour from '@/components/TourneoRetour';
import {supabase} from '@/lib/supabase';
import {pagesPhases,type PagePhase} from '@/lib/affiche-phases';
import {nomParticipant} from '@/lib/rotation';
import {urlPubliqueTournoi} from '@/lib/url-publique';
import {tr,trModele,useLangue,localeFormat} from '@/lib/langue';
import type {Equipe,Match} from '@/types';
type Donnees={nom:string;format:string;equipes:Equipe[];matchs:Match[];valides:number[]};
export default function ResultatsPhases(){
 useLangue();const {id}=useParams<{id:string}>();
 const[d,setD]=useState<Donnees|null>(null),[erreur,setErreur]=useState(''),[choix,setChoix]=useState('tout'),[format,setFormat]=useState<'A4'|'A3'>('A4'),[lien,setLien]=useState(''),[sponsors,setSponsors]=useState<string[]>([]),[instant,setInstant]=useState('');
 useEffect(()=>{let actif=true;void(async()=>{
  const a=await supabase.auth.getUser();if(!a.data.user)throw new Error('Connectez-vous pour créer une affiche.');
  const r=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',a.data.user.id).single();if(r.error||!r.data)throw new Error('Tournoi introuvable ou accès organisateur requis.');
  const p=await supabase.rpc('tourneo_public_v2',{p_id:id});if(!actif)return;
  const t=r.data.donnees||{};setD({nom:r.data.nom,format:t.formatTournoi||'complet',equipes:t.equipes||[],matchs:t.matchs||[],valides:t.matchsValides||[]});setInstant(new Date().toISOString());
  if(!p.error&&(Array.isArray(p.data)?p.data.length>0:!!p.data))setLien(urlPubliqueTournoi(id));
  try{const ancien=JSON.parse(localStorage.getItem(`tourneo-affiche:${a.data.user.id}:${id}`)||'null');if(Array.isArray(ancien?.sponsors))setSponsors(ancien.sponsors.filter((v:unknown)=>typeof v==='string'&&v.length<=500000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v)).slice(0,6));}catch{}
 })().catch(()=>{if(actif)setErreur('Impossible de charger les résultats. Vérifiez votre connexion et votre accès au tournoi.');});return()=>{actif=false;};},[id]);
 const pages=useMemo(()=>pagesPhases(d?.matchs??[],d?.format??''),[d]);
 const phases=useMemo(()=>pages.filter((p,i)=>pages.findIndex(q=>q.cle===p.cle)===i),[pages]);
 const selection=choix==='tout'?pages:pages.filter(p=>p.cle===choix);
 const valides=new Set(d?.valides??[]);
 function nom(m:Match,cote:1|2){return nomParticipant(cote===1?m.equipe1Id:m.equipe2Id,d?.equipes??[]);}
 function statut(m:Match){return valides.has(m.id)?'Validé':m.score1!==''&&m.score2!==''?'À valider':'À jouer';}
 function score(m:Match){return m.score1!==''&&m.score2!==''?`${m.score1} – ${m.score2}`:'—';}
 function afficherTitre(p:PagePhase){return p.titre.replace(/^(Tour|Ronde|Journée|Poules · journée) (\d+)/,(_,mot,n)=>tr(mot)+' '+n).replace(/ · (Tableau principal|Repêchage|Consolante)$/,(_,mot)=>' · '+tr(mot));}
 return <main className="v2-page tourneo-phase-print"><div className="v2-shell"><section className="v2-card tourneo-phase-controls"><TourneoRetour href={`/tournoi/${id}`}>{tr('Retour au tournoi')}</TourneoRetour><h1>{tr('Résultats par journée ou phase')}</h1><p>{tr('Choisissez une phase ou tout le tournoi. Les rencontres sont réparties automatiquement sur plusieurs pages pour rester lisibles.')}</p>{erreur&&<p role="alert">{tr(erreur)}</p>}{!d&&!erreur&&<p role="status">{tr('Chargement…')}</p>}{d&&<><div className="tourneo-tool-fields"><label>{tr('Journée ou phase')}<select value={choix} onChange={e=>setChoix(e.target.value)}><option value="tout">{tr('Tout le tournoi')}</option>{phases.map(p=><option key={p.cle} value={p.cle}>{tr(afficherTitre(p))}</option>)}</select></label><label>{tr('Format')}<select value={format} onChange={e=>setFormat(e.target.value as 'A4'|'A3')}><option value="A4">A4</option><option value="A3">A3</option></select></label></div><p>{trModele('{0} page(s) à imprimer',selection.length)}</p><button type="button" disabled={!selection.length} onClick={()=>window.print()}>{tr('Imprimer / enregistrer en PDF')}</button><p className="tourneo-tool-note">{tr('Les scores non validés sont signalés. Les futures phases apparaîtront une fois leurs rencontres générées.')}</p>{!lien&&<p>{tr('Le tournoi n’est pas partagé : aucun QR public n’est ajouté.')}</p>}{!pages.length&&<p>{tr('Aucune rencontre générée pour le moment.')}</p>}</>}</section>
 <div className={`tourneo-phase-pages paper-${format}`}>
 {d&&selection.map((p,i)=><article key={`${p.cle}-${p.numero}`} className="tourneo-phase-sheet"><header><img src="/tourneo-officiel.png" alt="Tourneo" width={70} height={70}/><div><p>TOURNEO · {tr('Résultats')}</p><h2>{d.nom}</h2><h3>{tr(afficherTitre(p))}{p.total>1?` · ${p.numero}/${p.total}`:''}</h3></div>{lien&&<div className="tourneo-phase-qr"><QRCodeSVG value={lien} size={66} level="M" marginSize={4}/><small>{tr('Résultats en direct')}</small></div>}</header><p className="tourneo-phase-date">{tr('Édité le')} {instant?new Date(instant).toLocaleString(localeFormat()):''}</p><div className="tourneo-phase-matches">{p.matchs.map(m=><section key={m.id} className="tourneo-phase-match"><div><small>#{m.id}{m.terrain?` · ${tr('Terrain')} ${m.terrain}`:''}</small><small>{tr(statut(m))}</small></div><p><span>{nom(m,1)}</span><strong>{score(m)}</strong><span>{nom(m,2)}</span></p></section>)}</div><footer>{sponsors.length>0&&<div className="tourneo-phase-sponsors">{sponsors.map((src,j)=><img key={j} src={src} alt={`${tr('Sponsor')} ${j+1}`}/>)}</div>}<p className="tourneo-phase-footer-brand"><span className="tourneo-phase-footer-identity"><img src="/tourneo-logo.png" alt="Tourneo" /><span><strong>TOURNEO</strong><small>tourneo-app.vercel.app</small></span></span>{lien&&<span className="tourneo-phase-footer-qr"><QRCodeSVG value={lien} size={48} level="M"/><small>{tr("Voir le tournoi")}</small></span>}<span>{trModele('Page {0} / {1}',i+1,selection.length)}</span></p></footer></article>)}
 </div></div><style>{`@page{size:${format} portrait;margin:10mm}`}</style></main>;
}
