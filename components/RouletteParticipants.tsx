"use client";
import {useEffect,useRef,useState} from 'react';
import type {Equipe} from '@/types';
import {tirerEquipes,type EquipeTiree} from '@/lib/outils-arbitre';
import {sourcesParticipants} from '@/lib/participants-inscrits';
import {useSonTirage} from '@/lib/use-son-tirage';
import {tr,trModele} from '@/lib/langue';
import ChampEntier from './ChampEntier';
export default function RouletteParticipants({participants,onAppliquer}:{participants:Equipe[];onAppliquer:(equipes:Equipe[])=>void}){
 const sources=sourcesParticipants(participants),personnes=sources.flatMap(e=>e.joueurs?.length?e.joueurs:[e.nom]);
 const signature=JSON.stringify(sources),[validation,setValidation]=useState(''),[nombre,setNombre]=useState(2),[resultat,setResultat]=useState<{signature:string;equipes:EquipeTiree[]}|null>(null),[tourne,setTourne]=useState(false),[message,setMessage]=useState('');
 const son=useSonTirage('/audio/tourneo-roue.wav','tourneo-son-roue-v1'),timer=useRef<ReturnType<typeof setTimeout>|null>(null),verrou=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const dejaEquipes=participants.some(e=>e.membresOrigine?.length),validee=validation===signature;
 function tirer(){if(verrou.current||!validee)return;try{const tirage=tirerEquipes(personnes,nombre);verrou.current=true;setTourne(true);setResultat(null);setMessage('');son.jouer(true);timer.current=setTimeout(()=>{setResultat({signature,equipes:tirage});setTourne(false);verrou.current=false;},2400);}catch(e){setMessage(e instanceof Error?e.message:'Tirage impossible.');}}
 function appliquer(){if(!resultat||resultat.signature!==signature)return;const liste=resultat.equipes.map(e=>({...e,id:crypto.randomUUID(),emoji:'🏅',couleur:'#3B82F6',membresOrigine:sources.filter(p=>(p.joueurs?.length?p.joueurs:[p.nom]).some(n=>e.joueurs.includes(n))).map(p=>({...p,membresOrigine:undefined}))}));onAppliquer(liste);setResultat(null);setValidation('');setMessage('Équipes prêtes. Vous pouvez modifier leur nom et leurs membres avec le bouton Modifier.');}
 return <section className="tourneo-optional-panel tourneo-roster-wheel"><h3>{tr('Après les participants : les équipes')}</h3><p>{trModele('{0} personnes dans la liste. Aucun nom à recopier.',personnes.length)}</p>
 {dejaEquipes?<><p>{tr('Vos équipes sont constituées. Modifiez-les directement dans la liste au-dessus.')}</p><button type="button" disabled={tourne} onClick={()=>{onAppliquer(sources);setValidation('');setResultat(null);}}>{tr('Reprendre la liste des participants')}</button></>:!validee?<><p>{tr('Vérifiez les participants ci-dessus, puis validez la liste. La répartition en équipes reste facultative.')}</p><button type="button" disabled={tourne||personnes.length<2} onClick={()=>{setValidation(signature);setResultat(null);}}>{tr('Valider la liste et préparer les équipes')}</button></>:<><label>{tr('Nombre d’équipes')}<ChampEntier min={2} max={Math.min(32,personnes.length)} value={nombre} disabled={tourne} onValue={n=>{setNombre(n);setResultat(null);}}/></label><p>{tr('La roue répartit automatiquement les participants validés. Vous pourrez ajuster les équipes après le tirage.')}</p><div className={`tourneo-draw-wheel${tourne?' is-spinning':''}`} aria-hidden="true"><span>✦</span></div><button type="button" disabled={tourne} onClick={tirer}>{tr(tourne?'Tirage en cours…':'Lancer la roulette')}</button><button type="button" disabled={tourne} onClick={()=>{setValidation('');setResultat(null);}}>{tr('Revoir la liste')}</button></>}
 {message&&<p role="status">{tr(message)}</p>}{son.erreur&&<p role="alert">{tr(son.erreur)}</p>}
 {!dejaEquipes&&validee&&resultat?.signature===signature&&<><div className="tourneo-drawn-teams">{resultat.equipes.map((e,i)=><article key={i}><strong>{e.nom}</strong><ul>{e.joueurs.map(j=><li key={j}>{j}</li>)}</ul></article>)}</div><button type="button" onClick={appliquer}>{tr('Utiliser ces équipes dans le tournoi')}</button></>}
 </section>;
}
