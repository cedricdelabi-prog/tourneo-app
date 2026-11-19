"use client";
import {useEffect,useState} from 'react';
import type {Match,Equipe} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {exporterComparaisonImprevu,preparerImprevu} from '@/lib/imprevus-tournoi';
import {heureCreneau} from '@/lib/planning';
import {nomParticipant} from '@/lib/rotation';
import {tr,trModele,useLangue} from '@/lib/langue';

type Proposition=ReturnType<typeof preparerImprevu>;
type Apercu={signature:string;resultat:Proposition};
export default function ImprevusTournoi({matchs,equipes,valides,options,onChange}:{
 matchs:Match[];equipes:Equipe[];valides:readonly number[];options:OptionsV2;onChange:(options:OptionsV2)=>void
}){
 useLangue();
 const [retard,setRetard]=useState(10),[fermes,setFermes]=useState<number[]>(options.adaptationPlanning?.terrainsFermes||[]);
 const [apercu,setApercu]=useState<Apercu|null>(null),[montrerTout,setMontrerTout]=useState(false);
 const [annulation,setAnnulation]=useState<{signature:string;avant:OptionsV2;apres:string}|null>(null);
 const [message,setMessage]=useState('');
 const fermetureSauvegardee=JSON.stringify(options.adaptationPlanning?.terrainsFermes||[]);
 useEffect(()=>{
  setFermes(JSON.parse(fermetureSauvegardee) as number[]);
  setApercu(null);
 },[fermetureSauvegardee,options.terrains]);
 const signature=JSON.stringify([matchs,valides,options]);
 const pret=apercu?.signature===signature?apercu.resultat:null;
 const actifs=options.terrains-fermes.length;
 const presets=[0,5,10,15,30,60];
 const minutes=(n:number)=>n>0?`+${n} min`:`${n} min`;
 function calculer(){
  try{
   const resultat=preparerImprevu(matchs,valides,options,retard,fermes);
   setApercu({signature,resultat});setMontrerTout(false);setMessage('');
  }catch(e){setApercu(null);setMessage(e instanceof Error?e.message:'Planning indisponible.');}
 }
 function appliquer(proposition:Proposition){
  setAnnulation({signature:JSON.stringify([matchs,valides]),avant:options,apres:JSON.stringify(proposition.options)});
  onChange(proposition.options);setApercu(null);
  setMessage('Planning adapté. Les rencontres et leurs résultats sont conservés.');
 }
 function exporterCSV(proposition:Proposition){
  try{
   const csv=exporterComparaisonImprevu(proposition.changements,matchs,equipes,options.depart);
   const fichier=new Blob([csv],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(fichier),a=document.createElement('a');
   a.href=url;a.download='tourneo-comparatif-planning.csv';
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage('Comparatif des changements téléchargé.');
  }catch{setMessage('Export impossible sur cet appareil.');}
 }
 return <details className="tourneo-assistant tourneo-imprevus">
  <summary><strong>{tr('Gérer un imprévu')}</strong><span>{tr('Retard ou terrain indisponible : simulez les conséquences avant toute modification.')}</span></summary>
  <p>{tr('Aucun résultat n’est modifié. Les rencontres validées ou comportant un score restent à leur place.')}</p>
  <fieldset className="tourneo-imprevus-presets">
   <legend>{tr('Retard estimé à absorber')}</legend>
   <div className="tourneo-imprevus-quick" role="group" aria-label={tr('Choisir un retard')}>
    {presets.map(n=><button type="button" key={n} className={retard===n?'actif':''} aria-pressed={retard===n} onClick={()=>{setRetard(n);setApercu(null);}}>{n===0?tr('Aucun'):minutes(n)}</button>)}
   </div>
   <label>{tr('Autre retard (minutes)')}
    <input type="number" inputMode="numeric" min={0} max={240} step={1} value={retard}
     onChange={e=>{setRetard(e.target.value===''?0:Number(e.target.value));setApercu(null);}}/>
   </label>
  </fieldset>
  <fieldset className="tourneo-imprevus-courts">
   <legend>{tr('Terrains indisponibles pour la suite')}</legend>
   <p>{trModele('{0} terrain(s) encore disponible(s)',Math.max(0,actifs))}</p>
   <div className="tourneo-court-checks">
    {Array.from({length:options.terrains},(_,i)=>i+1).map(n=><label key={n}>
     <input type="checkbox" checked={fermes.includes(n)} disabled={!fermes.includes(n)&&actifs<=1}
      onChange={e=>{setFermes(a=>e.target.checked?[...a,n].sort((x,y)=>x-y):a.filter(x=>x!==n));setApercu(null);}}/>
     {trModele('Terrain {0}',n)}
    </label>)}
   </div>
   {fermes.length>0&&<button type="button" onClick={()=>{setFermes([]);setApercu(null);}}>{tr('Rouvrir tous les terrains')}</button>}
   <p className="tourneo-imprevus-help">{tr('Un terrain fermé ne recevra plus de nouveaux matchs. Les matchs avec un score déjà saisi restent protégés.')}</p>
  </fieldset>
  <div className="tourneo-imprevus-actions">
   <button type="button" disabled={!matchs.length} onClick={calculer}>{tr('Comparer les plannings')}</button>
  </div>
  {pret&&<section className="tourneo-change-preview" aria-label={tr('Proposition de planning')}>
   <h3>{trModele('{0} rencontre(s) à déplacer',pret.bilan.deplaces)}</h3>
   <div className="tourneo-imprevus-metrics">
    <div><strong>{pret.bilan.terrainsModifies}</strong><span>{tr('Changements de terrain')}</span></div>
    <div><strong>{pret.bilan.horairesModifies}</strong><span>{tr('Changements d’horaire')}</span></div>
    <div><strong>{pret.proteges}</strong><span>{tr('Matchs avec score protégés')}</span></div>
    <div><strong>{pret.bilan.inchanges}</strong><span>{tr('Matchs inchangés')}</span></div>
   </div>
   <p className="tourneo-imprevus-fin"><strong>{tr('Fin estimée')}</strong> : {heureCreneau(pret.finAvant,options.depart)} → {heureCreneau(pret.finApres,options.depart)} <span>({pret.bilan.variationFin>=0?'+':''}{pret.bilan.variationFin} {tr('min')})</span></p>
   <p>{tr('Retard maximal d’un match')} : {minutes(pret.bilan.retardMaximum)}. {tr('Cette simulation ne sauvegarde aucun changement tant que vous ne confirmez pas.')}</p>
   {pret.changements.length>0&&<ol className="tourneo-imprevus-liste">
    {(montrerTout?pret.changements:pret.changements.slice(0,8)).map(({avant,apres})=>{
     const m=matchs.find(m=>m.id===apres.matchId);
     if(!m)return null;
     return <li key={m.id}>
      <strong>{nomParticipant(m.equipe1Id,equipes)} / {nomParticipant(m.equipe2Id,equipes)}</strong>
      <span>{heureCreneau(avant.debut,options.depart)} · {trModele('Terrain {0}',avant.terrain)} → {heureCreneau(apres.debut,options.depart)} · {trModele('Terrain {0}',apres.terrain)}</span>
     </li>;
    })}
   </ol>}
   {!montrerTout&&pret.changements.length>8&&<button type="button" onClick={()=>setMontrerTout(true)}>{trModele('Voir les {0} modifications',pret.changements.length)}</button>}
   <div className="tourneo-imprevus-actions">
    <button type="button" disabled={!pret.changements.length} onClick={()=>appliquer(pret)}>{tr('Confirmer le nouveau planning')}</button>
    <button type="button" onClick={()=>exporterCSV(pret)}>{tr('Télécharger le comparatif CSV')}</button>
    <button type="button" onClick={()=>setApercu(null)}>{tr('Garder le planning actuel')}</button>
   </div>
  </section>}
  {annulation&&annulation.signature===JSON.stringify([matchs,valides])&&annulation.apres===JSON.stringify(options)&&<div className="tourneo-imprevus-undo">
   <span>{tr('Dernière adaptation appliquée')}</span>
   <button type="button" onClick={()=>{onChange(annulation.avant);setAnnulation(null);setMessage('Le planning précédent est rétabli.');}}>{tr('Annuler cette adaptation')}</button>
  </div>}
  {message&&<p role="status" className="tourneo-imprevus-feedback">{tr(message)}</p>}
 </details>;
}
