"use client";
import Link from 'next/link';
import {tr,useLangue} from '@/lib/langue';
export default function AffichesTournoi({id}:{id:string}){
 useLangue();const base=`/tournoi/${id}`;
 const cartes=[
  [`${base}/affiche?modele=inscriptions&format=A4`,'Annoncer le tournoi','Date, lieu et inscriptions'],
  [`${base}/affiche?modele=inscriptions&format=flyersA6`,'4 flyers A6 à découper','Une feuille A4 pour distribuer les inscriptions.'],
  [`${base}/pronostics/affiche`,'Affiche spectateurs','Un QR code pour participer aux pronostics.'],
  [`${base}/affiche?modele=resultats&format=A4`,'Présenter les résultats','Classement et remerciements'],
  [`${base}/affiches/resultats`,'Résultats par journée ou phase','Journées, quarts, demies et finale, sur plusieurs pages lisibles.'],
 ];
 return <section className="v2-card"><span className="v2-eyebrow">Tourneo</span><h2>{tr('Mes affiches')}</h2><p>{tr('Retrouvez ici tous les supports pour vos joueurs, vos spectateurs et votre club.')}</p><div className="tourneo-affiches-hub">{cartes.map(([href,titre,description])=><Link key={href} href={href}><span aria-hidden="true">↗</span><h3>{tr(titre)}</h3><p>{tr(description)}</p><strong>{tr('Ouvrir')}</strong></Link>)}</div></section>;
}
