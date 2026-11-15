"use client";
import {useState} from 'react';
import {preparerVisuelAffiche} from '@/lib/visuel-affiche';
import {tr,useLangue} from '@/lib/langue';
export default function ChoixVisuelAffiche({value,onChange}:{value:string;onChange:(v:string)=>void}){
 useLangue();const[message,setMessage]=useState(''),[occupe,setOccupe]=useState(false);
 return <div className="tourneo-custom-poster-image"><label className="tourneo-upload-logo">{tr('Choisir ma propre image')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={occupe} onChange={async e=>{const input=e.currentTarget,f=input.files?.[0];if(!f)return;setOccupe(true);setMessage('');try{onChange(await preparerVisuelAffiche(f));}catch(e){setMessage(e instanceof Error?e.message:'Image illisible');}finally{setOccupe(false);input.value='';}}}/></label>{value&&<><img src={value} alt={tr('Mon image pour l’affiche')} style={{width:240,height:140,maxWidth:'100%',objectFit:'contain',borderRadius:12,margin:'12px 0'}}/><button type="button" disabled={occupe} onClick={()=>onChange('')}>{tr('Revenir au visuel proposé')}</button></>}<p className="tourneo-tool-note">{tr('Gardez le visuel proposé ou utilisez votre propre photo. Elle est adaptée à l’affiche sans être déformée et reste enregistrée sur cet appareil.')}</p>{occupe&&<p role="status">{tr('Préparation de l’image…')}</p>}{message&&<p role="alert">{tr(message)}</p>}</div>;
}
