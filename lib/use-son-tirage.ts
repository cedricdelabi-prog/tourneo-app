"use client";
import {useEffect,useRef,useState} from 'react';
export function useSonTirage(source:string,cle:string){
 const[actif,setActif]=useState(true),audio=useRef<HTMLAudioElement|null>(null);
 useEffect(()=>{try{setActif(localStorage.getItem(cle)!=='non');}catch{}return()=>{audio.current?.pause();};},[cle]);
 function changer(){setActif(v=>{const n=!v;if(audio.current)audio.current.muted=!n;try{localStorage.setItem(cle,n?'oui':'non');}catch{}return n;});}
 function jouer(apercu=false){try{if(!actif&&!apercu)return;const a=audio.current||(audio.current=new Audio(source));a.pause();a.currentTime=0;a.muted=false;a.volume=.7;void a.play().catch(()=>{});}catch{}}
 function arreter(){audio.current?.pause();}
 return{actif,changer,jouer,arreter};
}
