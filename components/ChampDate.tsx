"use client";
import {useId,type ChangeEvent,type InputHTMLAttributes} from 'react';
import {tr} from '@/lib/langue';
// Native date and time fields remain editable with the keyboard; the labels remove ambiguity.
export default function ChampDate(props:InputHTMLAttributes<HTMLInputElement>){
 const id=useId();
 if(props.type!=='datetime-local')return <input {...props} className={['tourneo-date',props.className].filter(Boolean).join(' ')}/>;
 const {value,onChange,id:champId,required,min,max,...rest}=props;
 const chaine=typeof value==='string'?value:'',date=chaine.split('T')[0],heure=chaine.split('T')[1]?.slice(0,5)||'';
 function changer(e:ChangeEvent<HTMLInputElement>,v:string){onChange?.({...e,target:{...e.target,value:v},currentTarget:{...e.currentTarget,value:v}});}
 return <span className="tourneo-date-heure" role="group" aria-label={props['aria-label']||tr('Date et heure')}>
  <span><span id={`${id}-date`}>{tr('Date')}</span><input {...rest} id={champId} type="date" aria-labelledby={`${id}-date`} required={required} min={typeof min==='string'?min.split('T')[0]:undefined} max={typeof max==='string'?max.split('T')[0]:undefined} value={date} onChange={e=>changer(e,e.target.value?`${e.target.value}T${heure||'00:00'}`:'')}/></span>
  <span><span id={`${id}-heure`}>{tr('Heure')}</span><input {...rest} id={undefined} type="time" aria-labelledby={`${id}-heure`} disabled={props.disabled||!date} required={required&&!!date} value={heure} onChange={e=>changer(e,date?`${date}T${e.target.value||'00:00'}`:'')}/></span>
 </span>;
}
