"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {assurerProfilCompte} from '@/lib/profil-compte';
import {supabase} from '@/lib/supabase';
import {tr,trModele,useLangue,localeFormat} from '@/lib/langue';
import {MODES_PRONOSTICS,nombrePronostics,reglePronostics,erreurPronostics,jetonPronosticInvite,type EtatPronostics} from '@/lib/pronostics';
import {urlPubliqueTournoi} from '@/lib/url-publique';
export function LienPronostics({id}:{id:string}){const[actif,setActif]=useState(false);useEffect(()=>{let present=true;void supabase.rpc('tourneo_pronostics_lecture',{p_id:id}).then(r=>{if(present&&!r.error)setActif(r.data?.actif===true);});return()=>{present=false;};},[id]);return actif?<a className="tourneo-nav-primary" href={`/partage/${id}/pronostics`}>{tr('Pronostics du public')}</a>:null;}
export default function PronosticsPublic({id}:{id:string}){
 useLangue();const[etat,setEtat]=useState<EtatPronostics|null>(null),[choix,setChoix]=useState<string[]>([]),[pseudo,setPseudo]=useState(''),[connecte,setConnecte]=useState(false),[message,setMessage]=useState(''),[charge,setCharge]=useState(true),[occupe,setOccupe]=useState(false);
 const [brouillon,setBrouillon]=useState(false);
 const verrou=useRef(false),modifie=useRef(false),present=useRef(true),jeton=useRef(''),numero=useRef(0),ancienCompte=useRef(false);
 const monJeton=useCallback(()=>{if(!jeton.current){try{jeton.current=jetonPronosticInvite(id,localStorage,()=>crypto.randomUUID());}catch{jeton.current=crypto.randomUUID();}}return jeton.current;},[id]);
 const appliquer=useCallback((data:EtatPronostics)=>{
  if(!present.current)return;setEtat(data);
  if(!modifie.current||data.ferme||data.compatible===false){modifie.current=false;setBrouillon(false);setChoix(data.mon_choix||[]);if(data.mon_nom)setPseudo(data.mon_nom);}
  if(data.ferme)setMessage(m=>m.startsWith('Votre pronostic est enregistré.')?'Votre pronostic enregistré est maintenant verrouillé.':m);setCharge(false);
 },[]);
 const charger=useCallback(async()=>{
  if(verrou.current)return;const n=++numero.current;let r=await supabase.rpc('tourneo_pronostics_lecture',{p_id:id});if(r.error)throw r.error;
  if(r.data?.invites_autorises){r=await supabase.rpc('tourneo_pronostics_invite_lecture',{p_id:id,p_jeton:monJeton()});if(r.error)throw r.error;}
  else if(!ancienCompte.current){ancienCompte.current=true;const a=await supabase.auth.getUser();if(a.data.user){const p=await assurerProfilCompte(a.data.user);if(present.current){setConnecte(true);setPseudo(p.display_name);}}}
  if(present.current&&n===numero.current)appliquer(r.data);
 },[id,appliquer,monJeton]);
 useEffect(()=>{present.current=true;jeton.current='';ancienCompte.current=false;modifie.current=false;const lancer=()=>void charger().catch(()=>{if(present.current){setCharge(false);setMessage('Impossible de charger le jeu. Actualisez pour réessayer.');}});lancer();const timer=setInterval(()=>{if(document.visibilityState!=='hidden')lancer();},15000);window.addEventListener('online',lancer);document.addEventListener('visibilitychange',lancer);return()=>{present.current=false;clearInterval(timer);window.removeEventListener('online',lancer);document.removeEventListener('visibilitychange',lancer);};},[charger]);
 async function voter(){
  if(verrou.current||!etat?.mode||etat.invites_autorises&&!pseudo.trim())return;verrou.current=true;++numero.current;setOccupe(true);setMessage('');
  try{const r=etat.invites_autorises?await supabase.rpc('tourneo_pronostics_invite_voter',{p_id:id,p_jeton:monJeton(),p_nom:pseudo.trim(),p_choix:choix.slice(0,nombrePronostics(etat.mode))}):await supabase.rpc('tourneo_pronostics_voter',{p_id:id,p_choix:choix.slice(0,nombrePronostics(etat.mode))});if(r.error)throw r.error;
   modifie.current=false;appliquer(r.data);if(present.current)setMessage('Votre pronostic est enregistré. Vous pouvez le modifier jusqu’à la clôture.');
  }catch(e){if(present.current)setMessage(erreurPronostics(e));}finally{verrou.current=false;if(present.current)setOccupe(false);}
 }
 async function retirer(){if(verrou.current||!confirm(tr('Supprimer votre participation à ce jeu ?')))return;verrou.current=true;++numero.current;setOccupe(true);try{const r=await supabase.rpc('tourneo_pronostics_invite_retirer',{p_id:id,p_jeton:monJeton()});if(r.error)throw r.error;modifie.current=false;appliquer(r.data);setMessage('Votre participation a été supprimée.');}catch{setMessage('Suppression non confirmée. Actualisez pour vérifier.');}finally{verrou.current=false;setOccupe(false);}}
 async function partager(){const url=urlPubliqueTournoi(id)+'/pronostics';try{if(navigator.share)await navigator.share({title:tr('Pronostics du public')+' · '+(etat?.nom||'Tourneo'),url});else{await navigator.clipboard.writeText(url);setMessage('Lien copié.');}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('Copiez le lien ci-dessous pour le partager.');}}
 const mode=etat?.mode||'vainqueur',n=nombrePronostics(mode),ferme=!!etat?.ferme||etat?.compatible===false,libre=etat?.invites_autorises===true;
 return <section className="v2-card tournoi-predictions"><span className="v2-eyebrow">{tr('À vous de pronostiquer !')}</span><h1>{tr('Pronostics du public')}</h1>{etat?.nom&&<h2>{etat.nom}</h2>}<p>{tr('Un jeu gratuit pour suivre le tournoi ensemble. Aucune mise d’argent, aucune récompense obligatoire.')}</p>{libre&&<p className="tourneo-free-badge">{tr('Sans compte · votre nom suffit')}</p>}{message&&<p role="status">{tr(message)}</p>}
  {charge?<p>{tr('Chargement…')}</p>:!etat?.actif?<p>{tr('Ce jeu n’est pas activé par l’organisateur.')}</p>:<>
   <div className="tourneo-prediction-summary"><strong>{tr(MODES_PRONOSTICS[mode])}</strong><span>{tr(ferme?'Pronostics fermés':'Pronostics ouverts')}</span><span>{trModele('{0} participation(s)',etat.nombre||0)}</span></div>
   <p>{tr(reglePronostics(mode))} {tr('En cas d’égalité, les pronostiqueurs partagent le même rang.')}</p><p>{tr('Le jeu ferme au lancement du tournoi, ou à l’échéance annoncée si elle arrive avant.')}{etat.cloture_at&&' '+new Date(etat.cloture_at).toLocaleString(localeFormat())}</p>{etat.compatible===false&&<p role="alert">{tr('Les participants du tournoi ont changé. Le jeu est suspendu pour vérification par l’organisateur.')}</p>}
   {!libre&&!connecte&&!ferme?<p><a className="tourneo-nav-primary" href={`/login?retour=${encodeURIComponent('/partage/'+id+'/pronostics')}`}>{tr('Me connecter pour pronostiquer')}</a> · {tr('Un compte Tourneo confirmé est nécessaire. Un pronostic par compte.')}</p>:<fieldset disabled={occupe||ferme||!libre&&!connecte}>
    <legend>{tr(etat.mon_choix&&!brouillon?'Mon pronostic enregistré':'Mon pronostic')}</legend>
    {libre?<label>{tr('Votre nom ou pseudo (obligatoire)')}<input type="text" required maxLength={80} autoComplete="nickname" value={pseudo} onChange={e=>{modifie.current=true;setBrouillon(true);setPseudo(e.target.value);}}/></label>:pseudo&&<p className="tourneo-tool-note">{tr('Pseudo visible')} : {pseudo}</p>}
    {Array.from({length:n},(_,i)=><label key={i}>{mode.endsWith('_libre')?trModele('Choix {0}',i+1):trModele('Place {0}',i+1)}<select aria-label={mode.endsWith('_libre')?trModele('Choix {0}',i+1):trModele('Place {0}',i+1)} value={choix[i]||''} onChange={e=>{modifie.current=true;setBrouillon(true);setChoix(a=>Array.from({length:n},(_,j)=>j===i?e.target.value:a[j]||''));}}><option value="">{tr('Choisir un participant')}</option>{etat.equipes?.map(e=><option key={e.id} value={e.id} disabled={choix.some((v,j)=>j!==i&&v===e.id)}>{e.nom}</option>)}</select></label>)}
    {!ferme&&<>{brouillon&&<p role="status">{tr('Choix modifiés : enregistrez avant la clôture.')}</p>}<p className="tourneo-tool-note">{tr('Votre pseudo et vos points apparaîtront dans le classement public après validation des résultats. Vos autres choix ne sont pas publiés.')}</p>{libre&&<p className="tourneo-tool-note">{tr('Votre pronostic reste modifiable depuis ce navigateur jusqu’à la clôture.')}</p>}<button type="button" disabled={libre&&!pseudo.trim()||choix.slice(0,n).filter(Boolean).length!==n||new Set(choix.slice(0,n)).size!==n} onClick={()=>void voter()}>{tr(occupe?'Enregistrement…':etat.mon_choix?'Modifier mon pronostic':'Enregistrer mon pronostic')}</button></>}
   </fieldset>}
   {etat.publie?<section><h2>{tr('Classement des pronostiqueurs')}</h2>{etat.mon_rang&&<p className="tourneo-my-prediction">{trModele('Mon rang : {0} · {1} point(s)',etat.mon_rang.rang,etat.mon_rang.points)}</p>}{!etat.classement?.length?<p>{tr('Aucune participation à ce jeu.')}</p>:<><p>{tr('Les 100 meilleurs pronostiqueurs sont affichés. Les ex æquo gardent le même rang.')}</p><ol className="tourneo-prediction-ranking">{etat.classement.map((r,i)=><li key={i}><strong>{r.rang}</strong><span>{r.pseudo}</span><b>{r.points} {tr('points')}</b></li>)}</ol></>}</section>:ferme&&<p>{tr('Les pronostics sont verrouillés. Le classement du public paraîtra après validation et publication des résultats par l’organisateur.')}</p>}
   <div className="tourneo-tool-actions"><button type="button" onClick={()=>void partager()}>{tr('Partager ce jeu')}</button><button type="button" disabled={occupe} onClick={()=>void charger().catch(()=>setMessage('Actualisation impossible. Réessayez.'))}>{tr('Actualiser')}</button>{libre&&etat.mon_choix&&<button type="button" disabled={occupe} onClick={()=>void retirer()}>{tr('Supprimer ma participation')}</button>}</div><p className="tourneo-share-url">{urlPubliqueTournoi(id)+'/pronostics'}</p><p><a href="/confidentialite#pronostics">{tr('Confidentialité des pronostics')}</a></p>
  </>}
 </section>;
}
