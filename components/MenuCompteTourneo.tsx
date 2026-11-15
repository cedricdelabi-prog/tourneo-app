"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import SelecteurLangue from '@/components/SelecteurLangue';
import {tr,useLangue} from '@/lib/langue';
import {supabase} from '@/lib/supabase';
import {deconnecterTourneo} from '@/lib/push-client';
export default function MenuCompteTourneo({onLogout}:{onLogout?:()=>void|Promise<void>}){
 useLangue();const menu=useRef<HTMLDetailsElement>(null),[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false),[connecte,setConnecte]=useState(!!onLogout);
 useEffect(()=>{if(onLogout)return;let present=true;void supabase.auth.getUser().then(a=>{if(present)setConnecte(!!a.data.user);}).catch(()=>{});return()=>{present=false;};},[onLogout]);
 useEffect(()=>{const fermer=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node))menu.current?.removeAttribute('open');};const clavier=(e:KeyboardEvent)=>{if(e.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',fermer);document.addEventListener('keydown',clavier);return()=>{document.removeEventListener('pointerdown',fermer);document.removeEventListener('keydown',clavier);};},[]);
 async function quitter(){if(occupe||!window.confirm(tr('Vous déconnecter de Tourneo ?')))return;setOccupe(true);try{if(onLogout)await onLogout();else{const r=await deconnecterTourneo();if(r.error)throw r.error;window.location.assign('/login');}}catch{setMessage('Impossible de se déconnecter pour le moment.');}finally{setOccupe(false);}}
 return <details ref={menu} className="tourneo-account-menu"><summary><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg><span>{tr('Mon compte')}</span><small aria-hidden="true">⌄</small></summary><div className="tourneo-account-panel"><Link href={connecte?"/profil":"/login"}>{tr(connecte?"Mon profil":"Se connecter")}</Link><div className="tourneo-account-language"><span>{tr('Langue de l’application')}</span><SelecteurLangue/></div><Link href="/regles">{tr('Règles des jeux')}</Link><Link href="/aide">{tr('Aide')}</Link><Link href="/conditions-utilisation">{tr('Conditions d’utilisation')}</Link><Link href="/confidentialite">{tr('Confidentialité')}</Link><Link href="/contact">{tr('Contact')}</Link>{connecte&&<div className="tourneo-account-exit"><button type="button" disabled={occupe} onClick={()=>void quitter()}>{tr('Se déconnecter')}</button></div>}{message&&<p role="status">{tr(message)}</p>}</div></details>;
}
