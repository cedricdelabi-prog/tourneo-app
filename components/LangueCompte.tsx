"use client";
import {useEffect} from 'react';
import {supabase} from '@/lib/supabase';
import {changerLangue} from '@/lib/langue';
export default function LangueCompte(){
 useEffect(()=>{let actif=true;try{changerLangue(localStorage.getItem('tourneo-langue'));}catch{}async function charger(){const {data}=await supabase.auth.getUser();if(!actif||!data.user)return;const r=await supabase.from('tourneo_preferences').select('langue').eq('user_id',data.user.id).maybeSingle();if(actif&&!r.error&&r.data)changerLangue(r.data.langue);}void charger();window.addEventListener('tourneo-preferences',charger);const {data}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>{if(actif)void charger();},0);});return()=>{actif=false;window.removeEventListener('tourneo-preferences',charger);data.subscription.unsubscribe();};},[]);
 return null;
}
