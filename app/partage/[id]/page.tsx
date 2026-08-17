"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";

type Equipe = { id?: string; nom?: string; nomEquipe?: string; emoji?: string; photo?: string; couleur?: string };
type Match = { id?: number; journee?: number; equipe1Id?: string; equipe2Id?: string; score1?: string | number; score2?: string | number };
type Tournoi = { id: string; nom: string; sport?: string; donnees?: { equipes?: Equipe[]; matchs?: Match[]; formatTournoi?: string } };

const SPORTS: Record<string,string> = {
  multisport:"Multisport", football:"Football", futsal:"Futsal", basket:"Basket-ball", handball:"Handball", volley:"Volley-ball", rugby7:"Rugby à 7 / Touch",
  hockey:"Hockey", tennis:"Tennis", padel:"Padel", badminton:"Badminton", squash:"Squash", "ping-pong":"Tennis de table", petanque:"Pétanque", flechettes:"Fléchettes",
  bowling:"Bowling", billard:"Billard", babyfoot:"Baby-foot", cornhole:"Cornhole", palets:"Palets", molkky:"Mölkky", spikeball:"Roundnet", esport:"E-sport", echecs:"Échecs",
  dames:"Jeu de dames", cartes:"Jeux de cartes", jeuxsociete:"Jeux de société", autre:"Autre"
};

function Logo(){ return <div style={styles.brand}><div style={styles.mark}>T</div><strong>Tourneo</strong></div>; }

export default function PartagePage(){
  const params=useParams<{id:string}>();
  const [tournoi,setTournoi]=useState<Tournoi|null>(null);
  const [erreur,setErreur]=useState("");
  const [onglet,setOnglet]=useState<"matchs"|"classement"|"participants">("matchs");
  const [moiId,setMoiId]=useState("");
  const [suivi,setSuivi]=useState(false);
  const [messageSuivi,setMessageSuivi]=useState("");
  const derniereNotif=useRef("");

  useEffect(()=>{
    async function session(){
      const {data}=await supabase.auth.getSession();
      const id=data.session?.user?.id||"";
      setMoiId(id);
      setSuivi(localStorage.getItem(`tourneo-follow-${params.id}`)==="1");
    }
    session();
  },[params.id]);

  useEffect(()=>{
    let actif=true;
    async function charger(){
      const {data,error}=await supabase.rpc("get_tourneo_public",{p_id:params.id});
      if(!actif)return;
      const ligne=Array.isArray(data)?data[0]:data;
      if(error||!ligne){setErreur("Tournoi introuvable ou partage indisponible.");return;}
      setTournoi(ligne as Tournoi);
      setErreur("");
    }
    charger();
    const i=window.setInterval(charger,5000);
    return()=>{actif=false;window.clearInterval(i)};
  },[params.id]);

  const equipes=tournoi?.donnees?.equipes??[];
  const matchs=tournoi?.donnees?.matchs??[];
  const noms=useMemo(()=>Object.fromEntries(equipes.map((e)=>[e.id,e.nomEquipe||e.nom||"Participant"])),[equipes]);
  const joues=matchs.filter((m)=>m.score1!==""&&m.score1!==undefined&&m.score2!==""&&m.score2!==undefined).length;
  const estParticipant=Boolean(moiId && equipes.some(e=>e.id===moiId));

  const classement=useMemo(()=>{
    const map:Record<string,{id:string;nom:string;mj:number;v:number;n:number;d:number;pour:number;contre:number;pts:number}>={};
    equipes.forEach((e)=>{if(e.id)map[e.id]={id:e.id,nom:e.nomEquipe||e.nom||"Participant",mj:0,v:0,n:0,d:0,pour:0,contre:0,pts:0}});
    matchs.forEach((m)=>{
      if(m.score1===""||m.score1===undefined||m.score2===""||m.score2===undefined||!m.equipe1Id||!m.equipe2Id)return;
      const a=map[m.equipe1Id],b=map[m.equipe2Id]; if(!a||!b)return;
      const s1=Number(m.score1),s2=Number(m.score2); a.mj++;b.mj++;a.pour+=s1;a.contre+=s2;b.pour+=s2;b.contre+=s1;
      if(s1>s2){a.v++;b.d++;a.pts+=3}else if(s2>s1){b.v++;a.d++;b.pts+=3}else{a.n++;b.n++;a.pts++;b.pts++;}
    });
    return Object.values(map).sort((a,b)=>b.pts-a.pts||((b.pour-b.contre)-(a.pour-a.contre)));
  },[equipes,matchs]);

  useEffect(()=>{
    if(!suivi||!moiId||!tournoi||typeof Notification==="undefined"||Notification.permission!=="granted")return;
    const prochain=matchs.find(m=>
      (m.equipe1Id===moiId||m.equipe2Id===moiId) &&
      (m.score1===""||m.score1===undefined||m.score2===""||m.score2===undefined)
    );
    if(!prochain)return;
    const signature=`${tournoi.id}-${prochain.id}-${prochain.equipe1Id}-${prochain.equipe2Id}`;
    if(derniereNotif.current===signature)return;
    derniereNotif.current=signature;
    const adversaire=prochain.equipe1Id===moiId?noms[prochain.equipe2Id||""]:noms[prochain.equipe1Id||""];
    new Notification("Tourneo · À vous de jouer",{body:`Votre prochain match${adversaire?` contre ${adversaire}`:""} est prêt.`});
  },[suivi,moiId,tournoi,matchs,noms]);

  async function activerSuivi(){
    if(!estParticipant){setMessageSuivi("Connectez-vous avec le compte du joueur inscrit dans ce tournoi.");return;}
    if(typeof Notification==="undefined"){setMessageSuivi("Les notifications ne sont pas disponibles sur ce navigateur.");return;}
    const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    if(permission!=="granted"){setMessageSuivi("Autorisez les notifications dans votre navigateur pour recevoir les alertes.");return;}
    localStorage.setItem(`tourneo-follow-${params.id}`,"1");
    setSuivi(true);
    setMessageSuivi("Alertes activées sur cet appareil.");
  }

  if(!tournoi&&!erreur)return <main style={styles.center}><Logo/><span>Connexion au live…</span></main>;
  if(erreur)return <main style={styles.center}><Logo/><h1>Partage indisponible</h1><p>{erreur}</p></main>;

  return <main style={styles.page}><div style={styles.shell}>
    <header style={styles.header}><Logo/><span style={styles.readOnly}>LECTURE SEULE · LIVE</span></header>

    <section style={styles.hero}>
      <span style={styles.eyebrow}>Tournoi en direct</span>
      <h1>{tournoi!.nom}</h1>
      <p>{SPORTS[tournoi!.sport||"multisport"]||tournoi!.sport} · {joues}/{matchs.length} résultats</p>
      <div style={styles.progress}><div style={{...styles.progressFill,width:`${matchs.length?Math.round(joues/matchs.length*100):0}%`}}/></div>
      {estParticipant&&<div style={styles.followBox}><div><strong>Vous participez à ce tournoi</strong><span>Activez les alertes pour être prévenu quand votre prochain match apparaît.</span></div><button style={styles.followButton} onClick={activerSuivi}>{suivi?"Alertes activées":"Suivre mes matchs"}</button></div>}
      {messageSuivi&&<span style={styles.followMessage}>{messageSuivi}</span>}
    </section>

    <AdSlot label="Publicité" compact />

    <nav style={styles.nav}>{([['matchs','Matchs'],['classement','Classement'],['participants','Participants']] as const).map(([v,l])=><button key={v} onClick={()=>setOnglet(v)} style={{...styles.tab,...(onglet===v?styles.tabActive:{})}}>{l}</button>)}</nav>

    {onglet==='matchs'&&<section style={styles.card}><h2>Matchs & résultats</h2><div style={styles.list}>{matchs.map((m,i)=><article style={{...styles.match,...((m.equipe1Id===moiId||m.equipe2Id===moiId)&&moiId?styles.myMatch:{})}} key={m.id??i}><span>{noms[m.equipe1Id||'']||'Participant'}</span><strong style={styles.score}>{m.score1===''||m.score1===undefined?'–':m.score1} <i>–</i> {m.score2===''||m.score2===undefined?'–':m.score2}</strong><span>{noms[m.equipe2Id||'']||'Participant'}</span></article>)}</div></section>}
    {onglet==='classement'&&<section style={styles.card}><h2>Classement</h2><div style={styles.table}>{classement.map((l,i)=><div style={styles.row} key={l.id}><strong>{i+1}</strong><span>{l.nom}</span><span>{l.mj} MJ</span><strong>{l.pts} pts</strong></div>)}</div></section>}
    {onglet==='participants'&&<section style={styles.card}><h2>Participants</h2><div style={styles.people}>{equipes.map((e,i)=><div style={styles.person} key={e.id??i}>{e.photo?<img src={e.photo} alt="" style={{...styles.personAvatar,borderColor:e.couleur||"#3B82F6"}}/>:<span>{e.emoji||'•'}</span>}<strong>{e.nomEquipe||e.nom||`Participant ${i+1}`}</strong></div>)}</div></section>}

    <footer style={styles.footer}>Actualisation automatique toutes les 5 secondes · Les visiteurs ne peuvent pas modifier les scores.</footer>
  </div></main>;
}

const styles:Record<string,CSSProperties>={
  page:{minHeight:'100vh',padding:'18px',background:'radial-gradient(circle at 18% 8%,rgba(124,92,255,.18),transparent 26%),radial-gradient(circle at 82% 12%,rgba(34,211,238,.12),transparent 24%),linear-gradient(145deg,#070a12,#0b1220)',color:'#f8fbff',fontFamily:"Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif"},shell:{maxWidth:1000,margin:'0 auto'},center:{minHeight:'100vh',display:'grid',placeItems:'center',alignContent:'center',gap:12,background:'#08101d',color:'white',textAlign:'center'},brand:{display:'flex',alignItems:'center',gap:10,fontSize:20},mark:{width:38,height:38,borderRadius:13,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)',fontWeight:900},header:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,padding:'12px 0 24px'},readOnly:{padding:'7px 10px',borderRadius:999,border:'1px solid rgba(34,211,238,.18)',background:'rgba(34,211,238,.06)',color:'#80ebff',fontSize:10,fontWeight:900,letterSpacing:1},hero:{padding:'28px',borderRadius:28,background:'linear-gradient(135deg,rgba(124,92,255,.14),rgba(59,130,246,.07))',border:'1px solid rgba(148,163,184,.12)',marginBottom:14},eyebrow:{color:'#72e7ff',fontSize:10,fontWeight:900,letterSpacing:1.5,textTransform:'uppercase'},progress:{height:8,borderRadius:999,overflow:'hidden',background:'rgba(255,255,255,.06)',marginTop:18},progressFill:{height:'100%',background:'linear-gradient(90deg,#7C5CFF,#3B82F6,#22D3EE)'},followBox:{marginTop:18,padding:14,borderRadius:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',background:'rgba(34,211,238,.055)',border:'1px solid rgba(34,211,238,.14)'},followButton:{padding:'10px 13px',borderRadius:12,border:0,background:'linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)',color:'white',fontWeight:900,cursor:'pointer'},followMessage:{display:'block',marginTop:8,color:'#91b8c9',fontSize:12},nav:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,padding:6,borderRadius:18,background:'rgba(255,255,255,.03)',margin:'14px 0'},tab:{padding:12,border:0,borderRadius:13,background:'transparent',color:'#91a5be',fontWeight:800,cursor:'pointer'},tabActive:{background:'linear-gradient(135deg,rgba(124,92,255,.25),rgba(59,130,246,.16))',color:'white'},card:{padding:20,borderRadius:24,background:'rgba(15,25,43,.78)',border:'1px solid rgba(148,163,184,.12)'},list:{display:'grid',gap:10},match:{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',gap:12,alignItems:'center',padding:14,borderRadius:16,border:'1px solid rgba(148,163,184,.10)',background:'rgba(255,255,255,.025)',textAlign:'center'},myMatch:{borderColor:'rgba(34,211,238,.35)',background:'rgba(34,211,238,.055)'},score:{fontSize:19,padding:'8px 12px',borderRadius:12,background:'rgba(59,130,246,.10)'},table:{display:'grid',gap:8},row:{display:'grid',gridTemplateColumns:'40px minmax(0,1fr) 70px 70px',gap:10,alignItems:'center',padding:12,borderBottom:'1px solid rgba(148,163,184,.09)'},people:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10},person:{display:'flex',alignItems:'center',gap:10,padding:13,borderRadius:15,background:'rgba(255,255,255,.03)'},personAvatar:{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid'},footer:{padding:'20px 4px',color:'#70849e',fontSize:12,textAlign:'center'}
};
