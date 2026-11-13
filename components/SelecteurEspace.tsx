"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { tr } from '@/lib/langue';
import type { Espace } from '@/lib/espace';
export default function SelecteurEspace({ onEspace }: { onEspace: (e:Espace)=>void }) {
  const router = useRouter();
  const [espace,setEspace]=useState<Espace>('organisateur'),[user,setUser]=useState(''),[arbitre,setArbitre]=useState(false),[admin,setAdmin]=useState(false);
  useEffect(()=>{let present=true;void(async()=>{const {data}=await supabase.auth.getUser();if(!data.user||!present)return;const[a,adm]=await Promise.all([supabase.from('tourneo_arbitres').select('tournoi_id').eq('user_id',data.user.id).limit(1),supabase.rpc('tourneo_mon_role_admin')]);if(!present)return;const disponible=!a.error&&Boolean(a.data?.length);const adminDisponible=!adm.error&&['admin','superadmin'].includes(adm.data);setAdmin(adminDisponible);setUser(data.user.id);setArbitre(disponible);let choix:Espace='organisateur';try{const v=localStorage.getItem('tourneo-espace:'+data.user.id);if(v==='joueur'||(v==='admin'&&adminDisponible)||(v==='arbitre'&&disponible))choix=v;}catch{}if(window.location.pathname==='/arbitrage'&&disponible)choix='arbitre';if(window.location.pathname==='/mes-matchs')choix='joueur';if(window.location.pathname==='/administration'&&adminDisponible)choix='admin';setEspace(choix);onEspace(choix);})().catch(()=>{});return()=>{present=false;};},[onEspace]);
  if(!user)return null;
  return <label className="tourneo-espace-select">{tr('Mon espace')}<select value={espace} onChange={e=>{const v=e.target.value as Espace;setEspace(v);onEspace(v);try{localStorage.setItem('tourneo-espace:'+user,v);}catch{}router.push(v==='admin'?'/administration':v==='arbitre'?'/arbitrage':v==='joueur'?'/mes-matchs':'/dashboard');}}><option value="organisateur">{tr('Organisateur')}</option>{arbitre&&<option value="arbitre">{tr('Arbitre')}</option>}<option value="joueur">{tr('Joueur')}</option>{admin&&<option value="admin">{tr('Administration')}</option>}</select></label>;
}
