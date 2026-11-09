"use client";
import { useState } from 'react';
import { normaliserOptionsV2, type OptionsV2 } from '@/lib/options-v2';
export default function OptionsTournoiV2({ value, onChange, disabled=false }: {value:OptionsV2;onChange:(v:OptionsV2)=>void;disabled?:boolean}) {
  const [message,setMessage]=useState('');
  const changer=(cle:keyof OptionsV2,v:unknown)=>onChange(normaliserOptionsV2({...value,[cle]:v}));
  return <fieldset disabled={disabled} className="v2-settings"><legend>Organisation et règles</legend>
    <label>Mode<select value={value.mode} onChange={e=>changer('mode',e.target.value)}><option value="simple">Simple</option><option value="expert">Expert</option><option value="camping">Camping / Animation</option></select></label>
    {value.mode==='camping'&&<p>Sessions courtes, planning des terrains et feuille papier disponibles. Les résultats restent enregistrés sur cet appareil en cas de coupure.</p>}
    <label>Comptage du résultat<select value={value.score} onChange={e=>changer('score',e.target.value)}><option value="points">Points / buts</option><option value="sets">Sets / manches gagnantes</option></select></label>
    {value.score==='sets'&&<label>Nombre de sets gagnants<input type="number" min={1} max={5} value={value.setsGagnants} onChange={e=>changer('setsGagnants',Number(e.target.value))}/></label>}
    <details open={value.mode!=='simple'} className="v2-regles-detail"><summary>Réglages du tirage, du classement et du planning</summary>
    {value.score==='sets'&&<><label>Points pour gagner une manche (0 = libre)<input type="number" min={0} max={1000} value={value.cibleManche} onChange={e=>changer('cibleManche',Number(e.target.value))}/></label><label>Écart minimum<input type="number" min={1} max={10} value={value.ecartManche} onChange={e=>changer('ecartManche',Number(e.target.value))}/></label><label>Plafond d’une manche (0 = sans plafond)<input type="number" min={0} max={1000} value={value.plafondManche} onChange={e=>changer('plafondManche',Number(e.target.value))}/></label><label>Objectif manche décisive (0 = identique)<input type="number" min={0} max={1000} value={value.cibleDecisive} onChange={e=>changer('cibleDecisive',Number(e.target.value))}/></label></>}
    <label>Tirage<select value={value.tirage} onChange={e=>changer('tirage',e.target.value)}><option value="aleatoire">Aléatoire</option><option value="equilibre">Équilibré selon les niveaux</option><option value="manuel">Manuel selon les positions / poules</option></select></label>
    {value.mode!=='simple'&&<><label>Points de classement : victoire<input type="number" min={0} max={100} value={value.pointsVictoire} onChange={e=>changer('pointsVictoire',Number(e.target.value))}/></label><label>Match nul<input type="number" min={0} max={100} value={value.pointsNul} onChange={e=>changer('pointsNul',Number(e.target.value))}/></label><label>Défaite<input type="number" min={0} max={100} value={value.pointsDefaite} onChange={e=>changer('pointsDefaite',Number(e.target.value))}/></label></>}
    <label>Rondes (suisse / partenaires tournants)<input type="number" min={1} max={32} value={value.rondes} onChange={e=>changer('rondes',Number(e.target.value))}/></label>
    <label>Terrains disponibles<input type="number" min={1} max={32} value={value.terrains} onChange={e=>changer('terrains',Number(e.target.value))}/></label>
    <label>Durée estimée d’un match (minutes)<input type="number" min={1} max={240} value={value.duree} onChange={e=>changer('duree',Number(e.target.value))}/></label>
    <label>Repos minimum (minutes)<input type="number" min={0} max={120} value={value.repos} onChange={e=>changer('repos',Number(e.target.value))}/></label>
    <label>Début (facultatif)<input type="datetime-local" value={value.depart} onChange={e=>changer('depart',e.target.value)}/></label>
    <div><button type="button" onClick={()=>{try{localStorage.setItem('tourneo-modele-regles',JSON.stringify({...value,exemptions:[]}));setMessage('Modèle de règles enregistré sur cet appareil.');}catch{setMessage('Stockage indisponible.');}}}>Enregistrer ces règles comme modèle</button>
    <button type="button" onClick={()=>{try{const brut=localStorage.getItem('tourneo-modele-regles');if(brut){onChange(normaliserOptionsV2(JSON.parse(brut)));setMessage('Modèle chargé.');}else setMessage('Aucun modèle enregistré.');}catch{setMessage('Modèle illisible.');}}}>Charger mon modèle</button></div>
    </details>
    {message&&<p role="status">{message}</p>}
  </fieldset>;
}
