'use client';
import {useState,type ChangeEvent} from 'react';
import ConseilsLogos from '@/components/ConseilsLogos';
import {logoAffiche} from '@/lib/affiche';
import {copierIdentiteAffiche,normaliserIdentiteAffiche,type IdentiteAffiche} from '@/lib/modeles-affiche';
import {tr,useLangue} from '@/lib/langue';

export default function IdentiteVisuelleTournoi({valeur,onChanger}:{valeur:IdentiteAffiche|undefined;onChanger:(nouvelle:IdentiteAffiche)=>void}){
 useLangue();
 const identite=normaliserIdentiteAffiche(valeur);
 const [occupe,setOccupe]=useState(false),[erreur,setErreur]=useState('');
 function modifier(p:Partial<IdentiteAffiche>){onChanger(copierIdentiteAffiche({...identite,...p}));}
 async function ajouterImages(e:ChangeEvent<HTMLInputElement>,sponsors:boolean){
  const fichiers=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';
  if(occupe||!fichiers.length)return;
  setOccupe(true);setErreur('');
  try{
   const places=6-identite.sponsors.length;
   if(sponsors&&places<=0)throw Error('Six sponsors maximum par tournoi.');
   const images=await Promise.all((sponsors?fichiers.slice(0,places):fichiers.slice(0,1)).map(logoAffiche));
   if(images.some(i=>i.length>(sponsors?500000:3000000)))throw Error('Logo trop lourd après conversion. Choisissez une image plus légère.');
   if(sponsors)modifier({sponsors:[...identite.sponsors,...images].slice(0,6)});
   else modifier({logo:images[0]||''});
  }catch(e){setErreur(e instanceof Error?e.message:'Image illisible.');}
  finally{setOccupe(false);}
 }
 function deplacer(index:number,vers:-1|1){
  const cible=index+vers;if(cible<0||cible>=identite.sponsors.length)return;
  const copie=[...identite.sponsors];[copie[index],copie[cible]]=[copie[cible],copie[index]];
  modifier({sponsors:copie});
 }
 return <section className="v2-card tourneo-identite-tournoi" aria-labelledby="tourneo-identite-titre">
  <h2 id="tourneo-identite-titre">{tr('Logo et sponsors du tournoi')}</h2>
  <p>{tr('Ces images servent aux affiches et à l’écran TV. Ajoutez-les une seule fois, ou utilisez un modèle enregistré dans votre profil.')}</p>
  <fieldset className="tourneo-identite-fieldset" disabled={occupe}>
   <ConseilsLogos/>
   <label>{tr('Logo du tournoi ou du club')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void ajouterImages(e,false)}/></label>
   {identite.logo&&<div className="tourneo-identite-logo"><img src={identite.logo} alt={tr('Logo du tournoi')} loading="lazy" decoding="async"/><button type="button" onClick={()=>modifier({logo:''})}>{tr('Retirer le logo')}</button></div>}
   <ConseilsLogos sponsors/>
   <label>{tr('Logos des partenaires (6 maximum)')}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={identite.sponsors.length>=6} onChange={e=>void ajouterImages(e,true)}/></label>
   <div className="tourneo-identite-sponsors">{identite.sponsors.map((image,i)=><div className="tourneo-identite-sponsor" key={i}>
    <img src={image} alt={`${tr('Sponsor')} ${i+1}`} loading="lazy" decoding="async"/>
    <div><button type="button" disabled={i===0} aria-label={`${tr('Monter le sponsor')} ${i+1}`} onClick={()=>deplacer(i,-1)}>↑</button><button type="button" disabled={i===identite.sponsors.length-1} aria-label={`${tr('Descendre le sponsor')} ${i+1}`} onClick={()=>deplacer(i,1)}>↓</button><button type="button" onClick={()=>modifier({sponsors:identite.sponsors.filter((_,j)=>j!==i)})}>{tr('Retirer')}</button></div>
   </div>)}</div>
   <label>{tr('Message pour les affiches')}<textarea rows={2} maxLength={200} value={identite.message} onChange={e=>modifier({message:e.target.value})}/></label>
  </fieldset>
  {erreur&&<p className="tourneo-identite-erreur" role="alert">{tr(erreur)}</p>}
  <p className="tourneo-identite-note">{tr('La sauvegarde utilise la synchronisation du tournoi. Vérifiez son statut avant de quitter la page.')}</p>
 </section>;
}