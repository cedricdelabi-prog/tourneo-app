"use client";
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {tr,useLangue} from '@/lib/langue';
type PhotoPublique={id:string;path:string;telechargement_path?:string|null;legende:string;url?:string};
export function LienAlbumPublic({id}:{id:string}){const[actif,setActif]=useState(false);useLangue();useEffect(()=>{let present=true;void supabase.rpc('tourneo_album_public',{p_tournoi:id}).then(r=>{if(present)setActif(!r.error&&r.data?.actif===true);});return()=>{present=false;};},[id]);return actif?<a className="tourneo-album-link" href={`/partage/${id}/photos`}>{tr('Photos du tournoi')}</a>:null;}
export default function AlbumPublic({id}:{id:string}){
 useLangue();
 const [protections,setProtections]=useState(false),[photos,setPhotos]=useState<PhotoPublique[]>([]),[actif,setActif]=useState(false),[telechargement,setTelechargement]=useState(false),[pret,setPret]=useState(false),[erreur,setErreur]=useState(''),[revision,setRevision]=useState(0),[page,setPage]=useState(0),[total,setTotal]=useState(0),[occupe,setOccupe]=useState(false);
 const courantes=useRef<string[]>([]),generation=useRef(0),autorise=useRef(false),verrou=useRef(false);
 const nettoyer=()=>{courantes.current.forEach(URL.revokeObjectURL);courantes.current=[];};
 useEffect(()=>{
  let present=true;const n=++generation.current;const urls:string[]=[];autorise.current=false;
  void(async()=>{
   const r=await supabase.rpc('tourneo_album_public',{p_tournoi:id});if(r.error)throw r.error;if(!present||n!==generation.current)return;
   setErreur('');setProtections(typeof r.data?.telechargement==='boolean');setActif(r.data?.actif===true);autorise.current=r.data?.actif===true&&r.data?.telechargement!==false;setTelechargement(autorise.current);
   if(!r.data?.actif){nettoyer();setPhotos([]);setTotal(0);setPret(true);return;}
   const liste:PhotoPublique[]=Array.isArray(r.data.photos)?r.data.photos.map((p:PhotoPublique)=>({...p,telechargement_path:typeof r.data.telechargement==='boolean'?p.telechargement_path:p.path})):[];setTotal(liste.length);
   const affiches=await Promise.all(liste.slice(0,(page+1)*20).map(async p=>{
    const d=await supabase.storage.from('tourneo-media').download(p.path);if(d.error||!d.data)return{...p,url:''};
    const url=URL.createObjectURL(d.data);urls.push(url);return{...p,url};
   }));
   if(present&&n===generation.current){nettoyer();courantes.current=urls;setPhotos(affiches);setPret(true);}else urls.forEach(URL.revokeObjectURL);
  })().catch(()=>{urls.forEach(URL.revokeObjectURL);if(present&&n===generation.current){setErreur('Album indisponible. Actualisez pour réessayer.');setPret(true);}});
  return()=>{present=false;++generation.current;urls.forEach(URL.revokeObjectURL);};
 },[id,revision,page]);
 useEffect(()=>{
  let present=true,enCours=false;
  const verifier=async()=>{
   if(enCours||document.visibilityState==='hidden')return;enCours=true;
   try{const r=await supabase.rpc('tourneo_album_public',{p_tournoi:id});if(!present||r.error)return;
    const permis=r.data?.actif===true&&r.data?.telechargement!==false;autorise.current=permis;setTelechargement(permis);
    if(r.data?.actif===false){++generation.current;setActif(false);setPhotos([]);nettoyer();}
   }finally{enCours=false;}
  };
  const reprise=()=>void verifier();const timer=setInterval(reprise,30000);window.addEventListener('online',reprise);document.addEventListener('visibilitychange',reprise);
  return()=>{present=false;clearInterval(timer);window.removeEventListener('online',reprise);document.removeEventListener('visibilitychange',reprise);nettoyer();};
 },[id]);
 async function telecharger(p:PhotoPublique){
  if(verrou.current||!autorise.current||!p.telechargement_path)return;verrou.current=true;setOccupe(true);setErreur('');const n=generation.current;
  try{
   // Re-read permission at the time of the request; Storage enforces it independently.
   const r=await supabase.rpc('tourneo_album_public',{p_tournoi:id});if(r.error)throw r.error;
   if(!r.data?.actif||r.data?.telechargement===false){autorise.current=false;setTelechargement(false);throw new Error();}
   const ligne=(r.data.photos as PhotoPublique[]).find(x=>x.id===p.id);const chemin=typeof r.data.telechargement==='boolean'?ligne?.telechargement_path:ligne?.path;if(!chemin)throw new Error();
   const d=await supabase.storage.from('tourneo-media').download(chemin);if(d.error||!d.data)throw new Error();
   if(n!==generation.current||!autorise.current)return;
   const url=URL.createObjectURL(d.data),a=document.createElement('a');a.href=url;a.download='tourneo-souvenir.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch{setErreur('Téléchargement indisponible. Vérifiez que le partage est toujours autorisé.');}finally{verrou.current=false;setOccupe(false);}
 }
 return <section className="v2-card tournoi-album"><div className="tourneo-section-heading"><h1>{tr('Photos du tournoi')}</h1><button type="button" onClick={()=>setRevision(v=>v+1)}>{tr('Actualiser')}</button></div>
  <p>{tr(protections?'Aperçus réduits et filigranés. Les originaux restent privés.':'Photos partagées volontairement par l’organisateur, avec leur bandeau personnalisé.')}</p><p className="tourneo-tool-note">{tr('Une capture d’écran reste possible sur le Web. Respectez le droit à l’image et les choix de l’organisateur.')}</p>
  {erreur&&<p role="alert">{tr(erreur)}</p>}{!pret&&<p>{tr('Chargement…')}</p>}{pret&&!actif&&<p>{tr('L’organisateur n’a pas partagé cet album, ou sa période de conservation est terminée.')}</p>}{pret&&actif&&!photos.length&&<p>{tr('Aucune photo partagée pour le moment.')}</p>}
  {actif&&!telechargement&&<p>{tr('L’organisateur autorise la consultation des aperçus uniquement.')}</p>}
  <div className="tourneo-album-grid">{photos.map(p=><figure key={p.id}>{p.url?<><img src={p.url} alt={p.legende||tr('Photo du tournoi')} loading="lazy" draggable={false}/>{telechargement&&p.telechargement_path&&<button type="button" disabled={occupe} onClick={()=>void telecharger(p)}>{tr('Télécharger cette photo')}</button>}</>:<p>{tr('Photo indisponible ou expirée.')}</p>}<figcaption>{p.legende}</figcaption></figure>)}</div>
  {actif&&photos.length<total&&<button type="button" onClick={()=>setPage(v=>v+1)}>{tr('Voir plus de photos')}</button>}<p><a href="/confidentialite#photos">{tr('Confidentialité et photos')}</a></p>
 </section>;
}
