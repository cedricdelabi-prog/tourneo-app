"use client";
import {useEffect,useRef,useState} from 'react';
import type {Equipe} from '@/types';
import {tirerEquipes,type EquipeTiree} from '@/lib/outils-arbitre';
import {useSonTirage} from '@/lib/use-son-tirage';
import {tr} from '@/lib/langue';
import ChampEntier from './ChampEntier';
export default function RouletteParticipants({participants,onAppliquer}:{participants:Equipe[];onAppliquer:(equipes:Equipe[])=>void}){
 const [noms,setNoms]=useState(''),[nombre,setNombre]=useState(2),[resultat,setResultat]=useState<EquipeTiree[]>([]),[tourne,setTourne]=useState(false),[message,setMessage]=useState('');
 const son=useSonTirage('/audio/tourneo-roue.wav','tourneo-son-roue-v1'),timer=useRef<ReturnType<typeof setTimeout>|null>(null),verrou=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function tirer(){if(verrou.current)return;try{const tirage=tirerEquipes(noms.split(/\r?\n/),nombre);verrou.current=true;setTourne(true);setResultat([]);setMessage('');son.jouer();timer.current=setTimeout(()=>{setResultat(tirage);setTourne(false);verrou.current=false;},2400);}catch(e){setMessage(e instanceof Error?e.message:'Tirage impossible.');}}
 return <details className="tourneo-optional-panel"><summary>{tr('Former les équipes avec la roulette')}</summary><p>{tr('Une personne par ligne')}</p><textarea aria-label={tr('Une personne par ligne')} rows={6} maxLength={30000} value={noms} disabled={tourne} onChange={e=>{setNoms(e.target.value);setResultat([]);}}/>
 <button type="button" disabled={tourne||participants.length<2} onClick={()=>{setNoms(participants.flatMap(e=>e.joueurs?.length?e.joueurs:[e.nom]).join('\n'));setResultat([]);}}>{tr('Utiliser les participants ajoutés')}</button>
 <label>{tr('Nombre d’équipes')}<ChampEntier min={2} max={32} value={nombre} disabled={tourne} onValue={n=>{setNombre(n);setResultat([]);}}/></label>
 <div className={`tourneo-draw-wheel${tourne?' is-spinning':''}`} aria-hidden="true"><span>✦</span></div>
 <button type="button" disabled={tourne} onClick={tirer}>{tr(tourne?'Tirage en cours…':'Lancer la roulette')}</button><button type="button" aria-pressed={son.actif} onClick={son.changer}>{tr(son.actif?'Son de la roue activé':'Son de la roue coupé')}</button><button type="button" disabled={tourne} onClick={()=>son.jouer(true)}>{tr('Écouter le son')}</button>
 {message&&<p role="status">{tr(message)}</p>}{son.erreur&&<p role="alert">{tr(son.erreur)}</p>}
 {!!resultat.length&&<><div className="tourneo-drawn-teams">{resultat.map((e,i)=><article key={i}><strong>{e.nom}</strong><ul>{e.joueurs.map(j=><li key={j}>{j}</li>)}</ul></article>)}</div><p>{tr('Appliquer ce tirage remplace la liste actuelle. Les profils individuels ne sont pas transférés aux équipes.')}</p><button type="button" onClick={()=>{if(participants.length&&!confirm(tr('Remplacer les participants par les équipes tirées ?')))return;onAppliquer(resultat.map(e=>({...e,id:crypto.randomUUID(),emoji:'🏅',couleur:'#3B82F6'})));setResultat([]);setMessage('Équipes ajoutées au tournoi.');}}>{tr('Utiliser ces équipes dans le tournoi')}</button></>}
 </details>;
}
