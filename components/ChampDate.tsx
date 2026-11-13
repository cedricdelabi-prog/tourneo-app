"use client";
import type {InputHTMLAttributes}from'react';
// Native input keeps keyboard access; any pointer click opens its own picker when supported.
export default function ChampDate(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props} className={['tourneo-date',props.className].filter(Boolean).join(' ')} onClick={e=>{props.onClick?.(e);if(e.defaultPrevented||e.currentTarget.disabled||e.currentTarget.readOnly)return;try{e.currentTarget.showPicker?.();}catch{/* Browser fallback keeps the native calendar icon and keyboard editing. */}}}/>;}
