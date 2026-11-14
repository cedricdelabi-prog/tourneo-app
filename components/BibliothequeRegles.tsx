"use client";
import {useState} from 'react';
import Link from 'next/link';
import TourneoNav from '@/components/TourneoNav';
import ReglesSport from '@/components/ReglesSport';
import {CATALOGUE_SPORTS,chercherSports} from '@/lib/catalogue-sports';
import {tr,trModele,useLangue} from '@/lib/langue';
export default function BibliothequeRegles(){
 useLangue();const[recherche,setRecherche]=useState(''),[sport,setSport]=useState('petanque');const trouves=chercherSports(recherche,tr);
 return <main className="v2-page"><div className="v2-shell"><TourneoNav/>
  <section className="v2-card"><span className="v2-eyebrow">{tr('Préparer votre animation')}</span><h1>{tr('Règles des sports et jeux')}</h1><p>{trModele('{0} sports et activités : trouvez les repères du jeu et les variantes à annoncer.',CATALOGUE_SPORTS.length)}</p><p>{tr('Les fiches expliquent le jeu. Elles ne signifient pas que Tourneo arbitre automatiquement toutes les fautes ou calcule chaque décompte spécialisé.')}</p><Link href="/tournoi/nouveau">{tr('Créer un tournoi')}</Link></section>
  <div className="tourneo-rules-library"><section className="v2-card tournoi-rules-choice"><h2>{tr('Choisir un sport ou un jeu')}</h2><label>{tr('Rechercher un sport ou un jeu')}<input type="search" maxLength={100} value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder={tr('Rechercher un sport : tennis, fléchettes…')}/></label><p role="status">{trModele('{0} résultat(s)',trouves.length)}</p><div className="tourneo-rules-list" aria-label={tr('Sports disponibles')}>{trouves.map(s=><button type="button" key={s.code} aria-pressed={sport===s.code} aria-controls="fiche-regles" onClick={()=>setSport(s.code)}><strong>{tr(s.nom)}</strong><small>{tr(s.categorie)}</small></button>)}</div>{!trouves.length&&<p>{tr('Aucun sport trouvé. Essayez un autre nom ou choisissez Autre sport / jeu.')}</p>}</section>
  <section id="fiche-regles" className="v2-card tournoi-rules-selected" aria-live="polite"><ReglesSport key={sport} sport={sport} deplie/></section></div>
 </div></main>;
}
