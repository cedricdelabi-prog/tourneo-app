"use client";
import {useState}from'react';
import {REGLES_SPORTS}from'@/lib/regles-sports';
import {libelleSport}from'@/lib/libelles-sports';
import {tr,useLangue}from'@/lib/langue';
const normaliser=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function motsCles(sport:string,i:number){return sport==='flechettes'?['distance hauteur installation distance height hoogte afstand','poids flechette fleches weight gewicht materiel','score 501 depassement bust double','format 301 501'][i]||'':'';}
export default function ReglesSport({sport,deplie=false}:{sport:string;deplie?:boolean}){
 useLangue();const[recherche,setRecherche]=useState('');const fiche=REGLES_SPORTS[sport];const mots=normaliser(recherche).split(/\s+/).filter(Boolean);
 const reperes=fiche?.reperes.filter((p,i)=>mots.every(m=>normaliser(p+' '+tr(p)+' '+motsCles(sport,i)).includes(m)))||[];
 return <details className="tourneo-sport-rules" key={sport} open={deplie||undefined}><summary>{tr('Règles et installation')} · {tr(libelleSport(sport))}</summary>{fiche?<><h4>{tr(fiche.titre)}</h4><label className="tourneo-rule-search">{tr('Chercher dans les règles')}<input type="search" value={recherche} maxLength={100} placeholder={tr('Mot-clé : distance, poids, score…')} onChange={e=>setRecherche(e.target.value)}/></label><ul>{reperes.map(p=><li key={p}>{tr(p)}</li>)}</ul>{!reperes.length&&<p role="status">{tr('Aucun repère ne correspond. Consultez le règlement officiel ci-dessous.')}</p>}{fiche.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{tr(s.nom)} ↗</a>)}</>:<p>{tr('Définissez avec les participants le nombre de joueurs, le terrain, la durée, le barème et le départage. Une fiche officielle détaillée n’est pas encore disponible pour cette discipline dans Tourneo.')}</p>}<p className="tourneo-tool-note">{tr('Ces repères aident à préparer l’animation. Le règlement annoncé par l’organisateur et les règles de sa fédération restent la référence.')}</p></details>;
}
