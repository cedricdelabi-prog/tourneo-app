"use client";
import {cloneElement,useEffect,useId,useLayoutEffect,useRef,useState,type ReactElement} from 'react';
import {createPortal} from 'react-dom';
import {tr,useLangue} from '@/lib/langue';

export default function AideInfo({titre,children}:{titre:string;children:React.ReactNode}) {
 useLangue();
 const [ouvert,setOuvert]=useState(false);
 const [position,setPosition]=useState({left:12,top:12,maxHeight:340});
 const id=useId(),zone=useRef<HTMLSpanElement>(null),bouton=useRef<HTMLButtonElement>(null),panneau=useRef<HTMLSpanElement>(null);
 const fermer=()=>{setOuvert(false);bouton.current?.focus();};
 useLayoutEffect(()=>{
  if(!ouvert)return;
  const placer=()=>{
   const ancre=bouton.current,contenu=panneau.current;if(!ancre||!contenu)return;
   const r=ancre.getBoundingClientRect(),vue=window.visualViewport;
   const gauche=vue?.offsetLeft||0,haut=vue?.offsetTop||0,largeur=vue?.width||innerWidth,hauteur=vue?.height||innerHeight;
   if(r.bottom<haut||r.top>haut+hauteur||r.right<gauche||r.left>gauche+largeur){setOuvert(false);return;}
   const dessous=Math.max(0,haut+hauteur-r.bottom-20),dessus=Math.max(0,r.top-haut-20);
   // Measure the actual help instead of reserving 360px above every field.
   const hauteurVoulue=Math.min(contenu.scrollHeight,340);
   const enDessous=dessous>=hauteurVoulue||dessous>=dessus;
   const maxHeight=Math.max(32,Math.min(340,enDessous?dessous:dessus));
   const h=Math.min(hauteurVoulue,maxHeight),w=contenu.getBoundingClientRect().width;
   const suivante={left:Math.max(gauche+12,Math.min(r.left,gauche+largeur-w-12)),top:enDessous?r.bottom+8:Math.max(haut+12,r.top-h-8),maxHeight};
   setPosition(p=>p.left===suivante.left&&p.top===suivante.top&&p.maxHeight===suivante.maxHeight?p:suivante);
  };
  placer();const observer=new ResizeObserver(placer);if(panneau.current)observer.observe(panneau.current);
  window.addEventListener('resize',placer);window.addEventListener('scroll',placer,true);
  window.visualViewport?.addEventListener('resize',placer);window.visualViewport?.addEventListener('scroll',placer);
  return()=>{observer.disconnect();window.removeEventListener('resize',placer);window.removeEventListener('scroll',placer,true);window.visualViewport?.removeEventListener('resize',placer);window.visualViewport?.removeEventListener('scroll',placer);};
 },[ouvert,titre,children]);
 useEffect(()=>{
  if(!ouvert)return;
  const exterieur=(e:PointerEvent)=>{if(!zone.current?.contains(e.target as Node)&&!panneau.current?.contains(e.target as Node))setOuvert(false);};
  const touche=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOuvert(false);bouton.current?.focus();}};
  document.addEventListener('pointerdown',exterieur);document.addEventListener('keydown',touche);
  return()=>{document.removeEventListener('pointerdown',exterieur);document.removeEventListener('keydown',touche);};
 },[ouvert]);
 return <span className="tourneo-info" ref={zone}>
  <button ref={bouton} type="button" className="tourneo-info-button" aria-label={tr('Informations')+' : '+tr(titre)} aria-expanded={ouvert} aria-controls={ouvert?id:undefined} onClick={e=>{e.preventDefault();e.stopPropagation();setOuvert(v=>!v);}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/></svg></button>
  {ouvert&&createPortal(<span ref={panneau} className="tourneo-info-panel" role="note" id={id} style={position}><strong>{tr(titre)}</strong><span>{typeof children==='string'?tr(children):children}</span><button type="button" onClick={fermer}>{tr('Fermer')}</button></span>,document.body)}
 </span>;
}
export function ChampAide({label,aide,children}:{label:string;aide?:string;children:ReactElement<{id?:string}>}){const id=useId();return <div className="tourneo-field"><div className="tourneo-field-label"><label htmlFor={id}>{tr(label)}</label>{aide&&<AideInfo titre={label}>{aide}</AideInfo>}</div>{cloneElement(children,{id})}</div>;}
