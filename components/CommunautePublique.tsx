"use client";
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {tr,trModele,useLangue,localeFormat} from '@/lib/langue';
export default function CommunautePublique(){
 useLangue();const [tranche,setTranche]=useState<{minimum:number;maximum:number}|null>(null);
 useEffect(()=>{let present=true;const controle=new AbortController();const timer=setTimeout(()=>controle.abort(),8000);
  void(async()=>{try{const r=await supabase.rpc('tourneo_communaute_publique').abortSignal(controle.signal);const d=r.data;if(present&&!r.error&&d?.mesure==='comptes_confirmes'&&Number.isSafeInteger(d.minimum)&&Number.isSafeInteger(d.maximum)&&d.minimum>=0&&d.maximum>=d.minimum)setTranche(d);}catch{}finally{clearTimeout(timer);}})();
  return()=>{present=false;clearTimeout(timer);controle.abort();};
 },[]);
 if(!tranche)return null;const n=(v:number)=>v.toLocaleString(localeFormat());
 return <aside className="tourneo-community" aria-label={tr('La communauté Tourneo')}><strong>{tranche.minimum===0?trModele('Moins de {0} comptes confirmés',n(tranche.maximum+1)):trModele('Entre {0} et {1} comptes confirmés',n(tranche.minimum),n(tranche.maximum))}</strong><span>{tr('Organisateurs, joueurs et spectateurs inscrits : chaque compte est compté une seule fois. Les visites sans compte ne sont pas incluses.')}</span></aside>;
}
