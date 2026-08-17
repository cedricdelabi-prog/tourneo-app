"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type P={id:string;display_name:string;player_code:string;avatar_url?:string|null;favorite_color?:string|null};
type R={id:string;tournament_name:string;sport:string;placement:number;points:number;created_at:string};

export default function JoueurPublic(){
  const{code}=useParams<{code:string}>();
  const[p,setP]=useState<P|null>(null);
  const[r,setR]=useState<R[]>([]);
  const[e,setE]=useState("");

  useEffect(()=>{
    async function charger(){
      const{data,error}=await supabase.from("profiles").select("id,display_name,player_code,avatar_url,favorite_color").eq("player_code",code.toUpperCase()).maybeSingle();
      if(error||!data){setE("Profil introuvable");return;}
      setP(data);
      const{data:rr}=await supabase.from("player_results").select("id,tournament_name,sport,placement,points,created_at").eq("profile_id",data.id).order("created_at",{ascending:false});
      setR((rr??[])as R[]);
    }
    charger();
  },[code]);

  const pts=useMemo(()=>r.reduce((s,x)=>s+x.points,0),[r]);
  const victoires=r.filter(x=>x.placement===1).length;
  if(e)return <main style={s.center}>{e}</main>;
  if(!p)return <main style={s.center}>Chargement…</main>;

  const couleur=p.favorite_color||"#3B82F6";
  return <main style={s.page}><div style={s.shell}>
    <section style={s.hero}>
      {p.avatar_url?<img src={p.avatar_url} alt="Avatar joueur" style={{...s.avatar,borderColor:couleur}}/>:<div style={{...s.avatarFallback,background:`linear-gradient(135deg,${couleur},#22D3EE)`}}>{p.display_name.slice(0,1).toUpperCase()}</div>}
      <div><span style={s.eyebrow}>Profil Tourneo</span><h1 style={s.title}>{p.display_name}</h1><p style={s.code}>{p.player_code}</p></div>
    </section>
    <section style={s.stats}><div><span>Points</span><strong>{pts}</strong></div><div><span>Victoires</span><strong>{victoires}</strong></div><div><span>Tournois</span><strong>{r.length}</strong></div></section>
    <section style={s.card}><h2>Palmarès</h2>{r.length?r.map(x=><div style={s.row} key={x.id}><span>{x.tournament_name}</span><strong>#{x.placement}</strong><strong>+{x.points}</strong></div>):<p style={s.muted}>Aucun tournoi identifié pour le moment.</p>}</section>
    <p style={s.note}>Profil public en lecture seule. Aucune donnée de contact n’est affichée.</p>
  </div></main>;
}

const s:Record<string,CSSProperties>={
  page:{minHeight:"100vh",padding:"32px 18px",background:"radial-gradient(circle at 20% 10%,rgba(124,92,255,.16),transparent 28%),linear-gradient(145deg,#070a12,#0b1220)",color:"white",fontFamily:"Inter,system-ui,sans-serif"},center:{minHeight:"100vh",display:"grid",placeItems:"center",background:"#08101d",color:"white"},shell:{maxWidth:800,margin:"0 auto"},hero:{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",padding:22,borderRadius:24,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},avatar:{width:96,height:96,borderRadius:"50%",objectFit:"cover",border:"4px solid"},avatarFallback:{width:96,height:96,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:36,fontWeight:900},title:{margin:"6px 0"},eyebrow:{color:"#72e7ff",fontSize:11,fontWeight:900,textTransform:"uppercase"},code:{color:"#8fa6c0"},stats:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"22px 0"},card:{padding:20,borderRadius:22,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},row:{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:8,padding:12,borderBottom:"1px solid rgba(148,163,184,.09)"},note:{color:"#7187a2",fontSize:12,textAlign:"center",marginTop:18},muted:{color:"#8094ae"}
};
