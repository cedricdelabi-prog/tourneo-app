"use client";
import { useEffect,useState } from 'react';
export default function OfflineV2(){
  const [horsLigne,setHorsLigne]=useState(false);
  useEffect(()=>{
    const etat=()=>setHorsLigne(!navigator.onLine);etat();window.addEventListener('online',etat);window.addEventListener('offline',etat);
    if('serviceWorker' in navigator && process.env.NODE_ENV==='production') navigator.serviceWorker.register('/sw-v2.js',{scope:'/'}).catch(()=>{});
    return()=>{window.removeEventListener('online',etat);window.removeEventListener('offline',etat);};
  },[]);
  return horsLigne?<div role="status" className="v2-offline">Hors connexion · les résultats sont enregistrés sur cet appareil. Gardez cet onglet ouvert jusqu’à la synchronisation.</div>:null;
}
