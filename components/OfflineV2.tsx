"use client";
import { useEffect,useState } from 'react';
export default function OfflineV2(){
  const [horsLigne,setHorsLigne]=useState(false);
  useEffect(()=>{
    const etat=()=>setHorsLigne(!navigator.onLine);etat();window.addEventListener('online',etat);window.addEventListener('offline',etat);
    if('serviceWorker' in navigator && process.env.NODE_ENV==='production') navigator.serviceWorker.register('/sw-v2.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready).then(registration=>{
      const ressources=performance.getEntriesByType('resource').map(r=>r.name).filter(url=>{const u=new URL(url);return u.origin===location.origin&&u.pathname.startsWith('/_next/static/');});
      registration.active?.postMessage({type:'CACHE_VISITED_PAGE',urls:[...new Set([location.href,...ressources])]});
    }).catch(()=>{});
    return()=>{window.removeEventListener('online',etat);window.removeEventListener('offline',etat);};
  },[]);
  return horsLigne?<div role="status" className="v2-offline">Hors connexion · les résultats sont enregistrés sur cet appareil. Gardez cet onglet ouvert jusqu’à la synchronisation.</div>:null;
}
