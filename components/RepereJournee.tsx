"use client";
import {useState} from 'react';
import type {Equipe,Match} from '@/types';
import type {OptionsV2} from '@/lib/options-v2';
import {heureCreneau,planifierMatchs} from '@/lib/planning';
import {nomParticipant} from '@/lib/rotation';
import {tr,trModele,useLangue} from '@/lib/langue';
export default function RepereJournee({matchs,equipes,options,valides,format}:{matchs:Match[];equipes:Equipe[];options:OptionsV2;valides:readonly number[];format:string}){
 useLangue();const[message,setMessage]=useState(''),planning=planifierMatchs(matchs,options),restants=planning.filter(c=>!valides.includes(c.matchId)),fin=Math.max(0,...planning.map(c=>c.fin)),toursDynamiques=!['complet','allerRetour','poules','rotation'].includes(format);
 const annonces=restants.slice(0,6).map(c=>{const m=matchs.find(m=>m.id===c.matchId)!;return trModele('Terrain {0} : {1} contre {2}. Merci de vous présenter à l’appel de l’organisateur.',c.terrain,nomParticipant(m.equipe1Id,equipes),nomParticipant(m.equipe2Id,equipes));});
 return <section className="tourneo-day-compass"><div><span className="v2-eyebrow">{tr('Votre journée')}</span><strong>{trModele('{0} rencontre(s) encore à valider',restants.length)}</strong><p>{tr('Fin estimée des rencontres générées')} : {heureCreneau(fin,options.depart)}</p>{toursDynamiques&&<small>{tr('Les tours suivants seront ajoutés selon les résultats. Cette heure ne couvre pas encore toute la compétition.')}</small>}{options.budgetMinutes&&fin>options.budgetMinutes&&<p role="status">{tr('Le planning dépasse le temps que vous aviez prévu.')}</p>}</div>{!!annonces.length&&<details><summary>{tr('Mes annonces prêtes à lire')}</summary><ol>{annonces.map((a,i)=><li key={i}>{a}</li>)}</ol><button type="button" onClick={()=>void navigator.clipboard.writeText(annonces.join('\n\n')).then(()=>setMessage('Annonces copiées.')).catch(()=>setMessage('Copie indisponible. Vous pouvez lire les annonces ci-dessus.'))}>{tr('Copier les annonces')}</button>{message&&<p role="status">{tr(message)}</p>}</details>}</section>;
}
