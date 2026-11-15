"use client";
import {useEffect,useRef,useState} from 'react';

// Start playback synchronously in the click: mobile browsers require a gesture.
export function useSonTirage(source:string,cle:string){
 const [actif,setActif]=useState(true),[erreur,setErreur]=useState(''),[lecture,setLecture]=useState(false);
 const audio=useRef<HTMLAudioElement|null>(null),contexte=useRef<AudioContext|null>(null);
 const generation=useRef(0),present=useRef(true);
 function preparer(){
  if(!audio.current){audio.current=new Audio(source);audio.current.preload='auto';audio.current.volume=1;}
  return audio.current;
 }
 function arreter(){generation.current++;audio.current?.pause();if(present.current)setLecture(false);}
 useEffect(()=>{
  present.current=true;
  try{setActif(localStorage.getItem(cle)!=='non');}catch{}
  try{preparer().load?.();}catch{}
  return()=>{present.current=false;generation.current++;audio.current?.pause();audio.current=null;void contexte.current?.close().catch(()=>{});contexte.current=null;};
 },[source,cle]);
 function changer(){
  arreter();setErreur('');
  setActif(v=>{const n=!v;try{localStorage.setItem(cle,n?'oui':'non');}catch{}return n;});
 }
 function jouer(apercu=false){
  if(!actif&&!apercu)return;
  const version=++generation.current;setErreur('');setLecture(false);
  const echouer=()=>{if(present.current&&version===generation.current){setLecture(false);setErreur('Le son n’a pas pu démarrer. Vérifiez le volume de votre appareil puis appuyez sur Écouter le son.');}};
  try{
   const a=preparer();a.pause();a.muted=false;a.volume=1;
   // Seeking before metadata is available throws on some mobile browsers.
   if(a.readyState>0)a.currentTime=0;
   const AudioCtx=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(AudioCtx&&!contexte.current){
    contexte.current=new AudioCtx();
    const gain=contexte.current.createGain();gain.gain.value=source.includes('roue')?2:1;
    const limiteur=contexte.current.createDynamicsCompressor();
    contexte.current.createMediaElementSource(a).connect(gain);gain.connect(limiteur);limiteur.connect(contexte.current.destination);
   }
   // Resume and play both execute within the same user gesture.
   const reprise=contexte.current?.resume();
   const demarrage=a.play();
   a.onended=()=>{if(present.current&&version===generation.current)setLecture(false);};
   a.onerror=echouer;
   void Promise.all([reprise,demarrage]).then(()=>{
    if(version!==generation.current)return;
    if(present.current)setLecture(true);
   }).catch(echouer);
  }catch{echouer();}
 }
 return{actif,changer,jouer,arreter,erreur,lecture};
}
