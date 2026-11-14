"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {tr,useLangue} from '@/lib/langue';
type Album={id:string;nom:string;photos:number};
type Photo={id:string;path:string;legende:string;url?:string};
export default function ModerationPhotos(){
 useLangue();const [albums,setAlbums]=useState<Album[]>([]),[page,setPage]=useState(0),[selection,setSelection]=useState<Album|null>(null),[motif,setMotif]=useState(''),[photos,setPhotos]=useState<Photo[]>([]),[fin,setFin]=useState<number|null>(null),[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false);
 const urls=useRef<string[]>([]),verrou=useRef(false),generation=useRef(0);
 const nettoyer=useCallback(()=>{urls.current.forEach(URL.revokeObjectURL);urls.current=[];},[]);
 const fermer=useCallback(()=>{++generation.current;nettoyer();setPhotos([]);setFin(null);setSelection(null);setMotif('');},[nettoyer]);
 useEffect(()=>{let present=true;void supabase.rpc('tourneo_admin_albums_partages',{p_page:page}).then(r=>{if(!present)return;if(r.error)setMessage('Albums indisponibles. Réessayez.');else{setAlbums(r.data||[]);setMessage('');}});return()=>{present=false;};},[page]);
 useEffect(()=>()=>{++generation.current;nettoyer();},[nettoyer]);
 useEffect(()=>{if(fin===null)return;const verifier=()=>{if(Date.now()>=fin){fermer();setMessage('Consultation terminée. Indiquez un motif pour rouvrir un album.');}};const timer=setInterval(verifier,1000);document.addEventListener('visibilitychange',verifier);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',verifier);};},[fin,fermer]);
 async function ouvrir(e:React.FormEvent){
  e.preventDefault();if(verrou.current||!selection||motif.trim().length<3)return;verrou.current=true;setOccupe(true);setMessage('');const n=++generation.current;const locales:string[]=[];
  try{const r=await supabase.rpc('tourneo_admin_ouvrir_album',{p_tournoi:selection.id,p_motif:motif.trim()});if(r.error)throw r.error;
   const expire=new Date(r.data.expire_at).getTime();if(!Number.isFinite(expire)||expire<=Date.now())throw new Error();
   const liste:Photo[]=await Promise.all((r.data.photos as Photo[]).map(async p=>{const d=await supabase.storage.from('tourneo-media').download(p.path);if(d.error||!d.data)return{...p,url:''};const url=URL.createObjectURL(d.data);locales.push(url);return{...p,url};}));
   if(n!==generation.current||Date.now()>=expire){locales.forEach(URL.revokeObjectURL);return;}
   nettoyer();urls.current=locales;setPhotos(liste);setFin(Math.min(expire,Date.now()+300000));setMessage('Consultation journalisée. Fermeture automatique après cinq minutes.');
  }catch{locales.forEach(URL.revokeObjectURL);if(n===generation.current)setMessage('Consultation non autorisée ou indisponible. Vérifiez le partage et réessayez.');}finally{verrou.current=false;setOccupe(false);}
 }
 return <section className="v2-card"><h2>{tr('Photos · modération')}</h2><p>{tr('Seuls les albums déjà partagés par leur organisateur sont consultables ici. Aucun accès aux originaux ni aux albums privés.')}</p>{message&&<p role="status">{tr(message)}</p>}
  {!selection?<><div className="tourneo-admin-albums">{albums.map(a=><article className="v2-entry" key={a.id}><div><h3>{a.nom}</h3><p>{a.photos} {tr('photo(s) partagée(s)')}</p></div><button type="button" onClick={()=>{setSelection(a);setMotif('');setMessage('');}}>{tr('Examiner cet album')}</button></article>)}</div>{!albums.length&&<p>{tr('Aucun album partagé à examiner.')}</p>}<div className="tourneo-tool-actions"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>{tr('Précédent')}</button><span>{page+1}</span><button type="button" disabled={albums.length<30} onClick={()=>setPage(p=>p+1)}>{tr('Suivant')}</button></div></>:<><h3>{selection.nom}</h3>{fin===null?<form className="v2-form" onSubmit={ouvrir}><label>{tr('Motif obligatoire')}<textarea required minLength={3} maxLength={300} value={motif} disabled={occupe} onChange={e=>setMotif(e.target.value)}/></label><button type="submit" disabled={occupe||motif.trim().length<3}>{tr(occupe?'Chargement…':'Ouvrir les aperçus pour cinq minutes')}</button></form>:<div className="tourneo-album-grid">{photos.map(p=><figure key={p.id}>{p.url?<img src={p.url} alt={p.legende||tr('Photo du tournoi')} draggable={false}/>:<p>{tr('Photo indisponible ou expirée.')}</p>}<figcaption>{p.legende}</figcaption></figure>)}</div>}<button type="button" onClick={fermer}>{tr('Fermer la consultation')}</button></>}
 </section>;
}
