"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Resultat = { id:string; tournament_name:string; sport:string; placement:number; points:number; created_at:string };

type Profil = {
  display_name: string;
  player_code: string;
  avatar_url?: string | null;
  favorite_color?: string | null;
};

function codeDepuisId(id:string){
  const c=id.replaceAll("-","").toUpperCase();
  return `TRN-${c.slice(0,4)}-${c.slice(4,8)}-${c.slice(8,12)}`;
}

export default function ProfilPage(){
  const[nom,setNom]=useState("");
  const[code,setCode]=useState("");
  const[uid,setUid]=useState("");
  const[avatarUrl,setAvatarUrl]=useState("");
  const[couleur,setCouleur]=useState("#3B82F6");
  const[resultats,setResultats]=useState<Resultat[]>([]);
  const[pret,setPret]=useState(false);
  const[msg,setMsg]=useState("");
  const[upload,setUpload]=useState(false);

  useEffect(()=>{
    async function init(){
      const{data}=await supabase.auth.getSession();
      const user=data.session?.user;
      if(!user){location.href="/login";return;}
      setUid(user.id);

      const{data:p}=await supabase
        .from("profiles")
        .select("display_name,player_code,avatar_url,favorite_color")
        .eq("id",user.id)
        .maybeSingle();

      const display=p?.display_name||user.email?.split("@")[0]||"Joueur Tourneo";
      const pc=p?.player_code||codeDepuisId(user.id);
      if(!p){
        await supabase.from("profiles").insert({
          id:user.id,
          display_name:display,
          player_code:pc,
          favorite_color:"#3B82F6",
        });
      }

      setNom(display);
      setCode(pc);
      setAvatarUrl(p?.avatar_url||"");
      setCouleur(p?.favorite_color||"#3B82F6");

      const{data:r}=await supabase
        .from("player_results")
        .select("id,tournament_name,sport,placement,points,created_at")
        .eq("profile_id",user.id)
        .order("created_at",{ascending:false});
      setResultats((r??[]) as Resultat[]);
      setPret(true);
    }
    init();
  },[]);

  const points=useMemo(()=>resultats.reduce((s,r)=>s+r.points,0),[resultats]);
  const victoires=resultats.filter(r=>r.placement===1).length;
  const sports=new Set(resultats.map(r=>r.sport)).size;
  const badges=[
    resultats.length>=1&&"Premier tournoi",
    victoires>=1&&"Champion",
    victoires>=5&&"Série de champions",
    resultats.length>=10&&"Habitué",
    sports>=3&&"Multisport",
  ].filter(Boolean) as string[];

  async function sauver(){
    if(!uid)return;
    const payload: Profil & {id:string} = {
      id:uid,
      display_name:nom.trim()||"Joueur Tourneo",
      player_code:code,
      avatar_url:avatarUrl||null,
      favorite_color:couleur,
    };
    const{error}=await supabase.from("profiles").upsert(payload,{onConflict:"id"});
    setMsg(error?error.message:"Profil enregistré");
  }

  async function choisirAvatar(fichier?: File){
    if(!fichier||!uid)return;
    setUpload(true);
    setMsg("Envoi de l’image…");
    const extension=(fichier.name.split(".").pop()||"png").toLowerCase();
    const chemin=`${uid}/avatar-${Date.now()}.${extension}`;
    const{error}=await supabase.storage.from("tourneo-media").upload(chemin,fichier,{upsert:true,contentType:fichier.type||undefined});
    if(error){setMsg(error.message);setUpload(false);return;}
    const{data}=supabase.storage.from("tourneo-media").getPublicUrl(chemin);
    setAvatarUrl(data.publicUrl);
    await supabase.from("profiles").upsert({id:uid,display_name:nom.trim()||"Joueur Tourneo",player_code:code,avatar_url:data.publicUrl,favorite_color:couleur},{onConflict:"id"});
    setMsg("Photo / GIF enregistré");
    setUpload(false);
  }

  if(!pret)return <main style={styles.center}>Chargement du profil…</main>;
  const lien=`${location.origin}/joueur/${code}`;

  return <main style={styles.page}><div style={styles.shell}>
    <header style={styles.header}>
      <div><span style={styles.eyebrow}>Profil joueur</span><h1 style={styles.title}>{nom}</h1><p style={styles.muted}>Votre identité Tourneo vous suit de tournoi en tournoi.</p></div>
      <div style={styles.actions}><button style={styles.ghost} onClick={()=>location.href="/dashboard"}>Mes tournois</button><button style={styles.ghost} onClick={()=>location.href="/aide"}>Aide</button><button style={styles.ghost} onClick={()=>location.href="/contact"}>Contact</button></div>
    </header>

    <section style={styles.grid}>
      <article style={styles.identityCard}>
        <span style={styles.eyebrow}>Identité visuelle</span>
        <div style={styles.avatarWrap}>
          {avatarUrl?<img src={avatarUrl} alt="Avatar Tourneo" style={{...styles.avatar,borderColor:couleur}}/>:<div style={{...styles.avatarFallback,background:`linear-gradient(135deg,${couleur},#22D3EE)`}}>{nom.slice(0,1).toUpperCase()}</div>}
        </div>
        <label style={styles.label}>Photo ou GIF</label>
        <input style={styles.file} type="file" accept="image/*,.gif" disabled={upload} onChange={(e)=>choisirAvatar(e.target.files?.[0])}/>
        <label style={styles.label}>Couleur du profil</label>
        <div style={styles.colorRow}><input type="color" value={couleur} onChange={(e)=>setCouleur(e.target.value)} style={styles.colorInput}/><strong>{couleur}</strong></div>
        <p style={styles.muted}>Cette photo et cette couleur seront reprises automatiquement quand un organisateur vous ajoute avec votre code Tourneo.</p>
      </article>

      <article style={styles.qrCard}>
        <span style={styles.eyebrow}>Identifiant personnel</span><h2>{code}</h2><div style={styles.qr}><QRCodeSVG value={lien} size={210}/></div><p style={styles.muted}>L’organisateur peut scanner ce QR ou saisir votre code pour vous ajouter à un tournoi.</p>
      </article>

      <article style={styles.statsCard}>
        <div style={styles.stat}><span>Points</span><strong>{points}</strong></div><div style={styles.stat}><span>Victoires</span><strong>{victoires}</strong></div><div style={styles.stat}><span>Tournois</span><strong>{resultats.length}</strong></div><div style={styles.stat}><span>Sports</span><strong>{sports}</strong></div>
        <label style={styles.label}>Pseudo public</label><input style={styles.input} value={nom} onChange={e=>setNom(e.target.value)}/><button style={styles.primary} onClick={sauver}>Enregistrer</button>{msg&&<span style={styles.muted}>{msg}</span>}
      </article>
    </section>

    <section style={styles.card}><span style={styles.eyebrow}>Badges</span><h2>Votre collection</h2><div style={styles.badges}>{badges.length?badges.map(b=><span key={b} style={styles.badge}>{b}</span>):<span style={styles.muted}>Jouez votre premier tournoi identifié pour débloquer vos badges.</span>}</div></section>
    <section style={styles.card}><span style={styles.eyebrow}>Palmarès</span><h2>Historique</h2><div style={styles.list}>{resultats.map(r=><div key={r.id} style={styles.row}><div><strong>{r.tournament_name}</strong><span style={styles.muted}>{r.sport}</span></div><strong>#{r.placement}</strong><strong>+{r.points} pts</strong></div>)}</div></section>
  </div></main>;
}

const styles:Record<string,CSSProperties>={
  page:{minHeight:"100vh",padding:"22px 18px 70px",background:"radial-gradient(circle at 18% 8%,rgba(124,92,255,.18),transparent 26%),radial-gradient(circle at 82% 12%,rgba(34,211,238,.10),transparent 24%),linear-gradient(145deg,#070a12,#0b1220)",color:"#f8fbff",fontFamily:"Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif"},
  center:{minHeight:"100vh",display:"grid",placeItems:"center",background:"#08101d",color:"white"},shell:{maxWidth:1100,margin:"0 auto"},
  header:{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap",marginBottom:24},eyebrow:{color:"#72e7ff",fontSize:10,fontWeight:900,letterSpacing:1.5,textTransform:"uppercase"},title:{fontSize:"clamp(38px,6vw,64px)",margin:"8px 0"},muted:{display:"block",color:"#8398b2",fontSize:13},actions:{display:"flex",gap:8,flexWrap:"wrap"},ghost:{padding:"11px 14px",borderRadius:13,border:"1px solid rgba(148,163,184,.14)",background:"rgba(255,255,255,.03)",color:"white",cursor:"pointer"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:16,marginBottom:16},identityCard:{padding:24,borderRadius:28,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)",display:"grid",gap:10},qrCard:{padding:24,borderRadius:28,background:"linear-gradient(135deg,rgba(124,92,255,.14),rgba(59,130,246,.07))",border:"1px solid rgba(148,163,184,.12)"},qr:{display:"inline-block",padding:14,borderRadius:18,background:"white",margin:"12px 0"},statsCard:{padding:24,borderRadius:28,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},
  avatarWrap:{display:"grid",placeItems:"center",padding:10},avatar:{width:132,height:132,borderRadius:"50%",objectFit:"cover",border:"4px solid",boxShadow:"0 14px 45px rgba(0,0,0,.22)"},avatarFallback:{width:132,height:132,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:48,fontWeight:900},
  file:{padding:10,borderRadius:12,border:"1px solid rgba(148,163,184,.16)",background:"#0a1322",color:"#9fb3c9"},colorRow:{display:"flex",gap:12,alignItems:"center"},colorInput:{width:56,height:40,border:0,borderRadius:10,background:"transparent"},
  stat:{padding:16,borderRadius:18,background:"rgba(255,255,255,.03)",display:"grid",gap:6},label:{gridColumn:"1/-1",fontWeight:800,fontSize:12,color:"#9ab0c9"},input:{gridColumn:"1/-1",padding:13,borderRadius:13,border:"1px solid rgba(148,163,184,.18)",background:"#0a1322",color:"white"},primary:{gridColumn:"1/-1",padding:13,border:0,borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)",color:"white",fontWeight:900,cursor:"pointer"},card:{padding:22,marginBottom:16,borderRadius:24,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},badges:{display:"flex",flexWrap:"wrap",gap:8},badge:{padding:"9px 12px",borderRadius:999,background:"rgba(124,92,255,.10)",border:"1px solid rgba(124,92,255,.18)",color:"#c7bdff",fontWeight:800},list:{display:"grid",gap:8},row:{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px 85px",gap:10,alignItems:"center",padding:13,borderBottom:"1px solid rgba(148,163,184,.09)"}
};
