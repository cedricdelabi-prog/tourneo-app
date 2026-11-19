"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {Equipe,Match} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {tr,trModele,useLangue} from '@/lib/langue';
import {bilanCockpitTournoi} from '@/lib/cockpit-tournoi';
import {heureCreneau} from '@/lib/planning';
import {nomParticipant} from '@/lib/rotation';
import {supabase} from '@/lib/supabase';

type Props={
 id:string;matchs:Match[];equipes:Equipe[];valides:number[];options:OptionsV2;termine:boolean;
 surOnglet:(onglet:'matchs'|'arbitrage')=>void;surPartage:()=>void;surImprevu:()=>void;
};
export default function ProchaineActionTournoi({id,matchs,equipes,valides,options,termine,surOnglet,surPartage,surImprevu}:Props){
 useLangue();
 const [propositions,setPropositions]=useState<number|null>(null),[propositionsErreur,setPropositionsErreur]=useState(false);
 useEffect(()=>{
  let present=true;
  setPropositions(null);setPropositionsErreur(false);
  async function lire(){
   try{
    const r=await supabase.from('tourneo_scores_proposes').select('match_id',{head:true,count:'exact'}).eq('tournoi_id',id).eq('statut','propose');
    if(!present)return;
    if(r.error)throw r.error;
    setPropositions(r.count??0);setPropositionsErreur(false);
   }catch{if(present)setPropositionsErreur(true);}
  }
  void lire();const timer=setInterval(()=>void lire(),30000);
  return()=>{present=false;clearInterval(timer);};
 },[id]);
 const bilan=useMemo(()=>bilanCockpitTournoi(matchs,valides,options),[matchs,valides,options]);
 if(!bilan.total&&!termine)return null;
 const prioritaire=bilan.prioritaire;
 const arbitres=typeof propositions==='number'&&propositions>0;
 const statut=arbitres?'arbitrage':prioritaire?.statut==='aValider'?'validation':prioritaire?.statut==='saisieIncomplet'?'saisie':prioritaire?'prochain':termine?'bilan':'attente';
 const phrase=arbitres?trModele('{0} proposition(s) d’arbitre à examiner',propositions):
  statut==='validation'?trModele('{0} résultat(s) à vérifier et valider',bilan.aValider):
  statut==='saisie'?trModele('{0} score(s) à compléter',bilan.saisiesIncompletes):
  statut==='bilan'?tr('Le tournoi est terminé. Préparez votre affiche de résultats.'):
  statut==='prochain'?tr('Les prochaines rencontres sont prêtes à être suivies.'):
  tr('Le tournoi est prêt à démarrer.');
 const action=arbitres?tr('Vérifier les propositions'):statut==='validation'?tr('Vérifier ce résultat'):
  statut==='saisie'?tr('Compléter ce score'):statut==='bilan'?tr('Partager le bilan'):tr('Voir le prochain match');
 function ouvrirPriorite(){
  if(arbitres){surOnglet('arbitrage');return;}
  if(statut==='bilan'){surPartage();return;}
  surOnglet('matchs');
  if(prioritaire)window.setTimeout(()=>{
   document.getElementById(`organisateur-match-${prioritaire.match.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
  },100);
 }
 return <section className="tourneo-cockpit" aria-label={tr('Pilotage des matchs')}>
  <div className="tourneo-cockpit-heading">
   <div><span className="v2-eyebrow">{tr('Poste de pilotage')}</span><h2>{tr('Suivi du tournoi en direct')}</h2>
    <p>{tr('Retrouvez les résultats à valider, les scores incomplets et le prochain match sans chercher dans tout le planning.')}</p></div>
   <div className="tourneo-cockpit-percent"><strong>{bilan.progression} %</strong><span>{tr('matchs validés')}</span></div>
  </div>
  <div className="tourneo-cockpit-track" role="progressbar" aria-label={tr('Avancement des rencontres validées')}
   aria-valuemin={0} aria-valuemax={100} aria-valuenow={bilan.progression}>
   <span style={{width:`${bilan.progression}%`}}/>
  </div>
  <div className="tourneo-cockpit-metrics">
   <div><strong>{bilan.valides}</strong><span>{tr('Validés')}</span></div>
   <div data-urgent={bilan.aValider>0}><strong>{bilan.aValider}</strong><span>{tr('À valider')}</span></div>
   <div data-urgent={bilan.saisiesIncompletes>0}><strong>{bilan.saisiesIncompletes}</strong><span>{tr('Scores incomplets')}</span></div>
   <div><strong>{bilan.aJouer}</strong><span>{tr('À jouer')}</span></div>
  </div>
  <div className="tourneo-cockpit-next" role="status">
   <div>
    <strong>{tr('Prochaine action')}</strong><p>{phrase}</p>
    {prioritaire&&!arbitres&&!termine&&<p className="tourneo-cockpit-match">
      {nomParticipant(prioritaire.match.equipe1Id,equipes)} / {nomParticipant(prioritaire.match.equipe2Id,equipes)}
      {prioritaire.creneau&&<> · {trModele('Terrain {0}',prioritaire.creneau.terrain)}
       {' · '}{heureCreneau(prioritaire.creneau.debut,options.depart)}</>}
    </p>}
    {propositions!==null&&propositions>0&&<small>{trModele('{0} proposition(s) d’arbitre en attente',propositions)}</small>}
    {propositionsErreur&&<small>{tr('Propositions d’arbitre temporairement indisponibles. Les scores locaux restent affichés.')}</small>}
   </div>
   <button type="button" onClick={ouvrirPriorite}>{action}</button>
  </div>
  <div className="tourneo-cockpit-tools">
   <button type="button" onClick={surImprevu}>{tr('Gérer un imprévu')}</button>
   <Link href={`/tournoi/${encodeURIComponent(id)}/tv`}>{tr('Piloter l’écran TV')}</Link>
  </div>
 </section>;
}
