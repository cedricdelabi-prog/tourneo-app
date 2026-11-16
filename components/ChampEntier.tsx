"use client";
import {useState,type InputHTMLAttributes} from 'react';
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'> & {value:number;onValue:(value:number)=>void};
// Keep the editing buffer separate so clearing a field does not immediately restore its minimum.
export default function ChampEntier({value,onValue,min=0,max=1000,onBlur,...props}:Props){
 const [edition,setEdition]=useState({source:value,texte:String(value)});
 if(edition.source!==value)setEdition({source:value,texte:String(value)});
 const texte=edition.source===value?edition.texte:String(value);
 const setTexte=(texte:string)=>setEdition({source:value,texte});
 return <input {...props} type="number" inputMode="numeric" step={1} min={min} max={max} value={texte} onChange={e=>{const s=e.target.value;setTexte(s);const n=Number(s);if(s!==''&&Number.isInteger(n)&&n>=Number(min)&&n<=Number(max))onValue(n);}} onBlur={e=>{const n=Number(texte);if(texte===''||!Number.isInteger(n)||n<Number(min)||n>Number(max))setTexte(String(value));onBlur?.(e);}}/>;
}
