"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import TourneoBrand from "@/components/TourneoBrand";

type Equipe = { id?: string; nom?: string; nomEquipe?: string; emoji?: string; photo?: string; couleur?: string };
type Match = { id?: number; journee?: number; equipe1Id?: string; equipe2Id?: string; score1?: string | number; score2?: string | number };
type Tournoi = { id: string; nom: string; sport?: string; donnees?: { equipes?: Equipe[]; matchs?: Match[]; formatTournoi?: string } };

export default function PartagePage() {
  const params = useParams<{ id: string }>();
  const [tournoi, setTournoi] = useState<Tournoi | null>(null);
  const [erreur, setErreur] = useState("");
  const [onglet, setOnglet] = useState<"matchs"|"classement"|"participants">("matchs");
  const [moiId, setMoiId] = useState("");
  const [suivi, setSuivi] = useState(false);
  const [message, setMessage] = useState("");
  const derniereNotif = useRef("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMoiId(data.session?.user?.id || ""));
    setSuivi(localStorage.getItem(`tourneo-follow-${params.id}`) === "1");
  }, [params.id]);

  useEffect(() => {
    let actif = true;
    async function charger() {
      const { data, error } = await supabase.rpc("get_tourneo_public", { p_id: params.id });
      if (!actif) return;
      const ligne = Array.isArray(data) ? data[0] : data;
      if (error || !ligne) { setErreur("Tournoi introuvable ou partage indisponible."); return; }
      setTournoi(ligne as Tournoi);
      setErreur("");
    }
    charger();
    const i = window.setInterval(charger, 5000);
    return () => { actif = false; window.clearInterval(i); };
  }, [params.id]);

  const equipes = tournoi?.donnees?.equipes ?? [];
  const matchs = tournoi?.donnees?.matchs ?? [];
  const noms = useMemo(() => Object.fromEntries(equipes.map((e) => [e.id, e.nomEquipe || e.nom || "Participant"])), [equipes]);
  const estParticipant = Boolean(moiId && equipes.some((e) => e.id === moiId));

  useEffect(() => {
    if (!suivi || !estParticipant || !moiId) return;
    const prochain = matchs.find((m) =>
      (m.equipe1Id === moiId || m.equipe2Id === moiId) &&
      (m.score1 === "" || m.score1 === undefined || m.score2 === "" || m.score2 === undefined)
    );
    if (!prochain) return;
    const key = `${prochain.id}-${prochain.equipe1Id}-${prochain.equipe2Id}`;
    if (derniereNotif.current === key) return;
    derniereNotif.current = key;

    const adversaire = prochain.equipe1Id === moiId ? noms[prochain.equipe2Id || ""] : noms[prochain.equipe1Id || ""];
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Tourneo · À vous de jouer", { body: `Votre prochain match contre ${adversaire || "votre adversaire"} est prêt.` });
    }
  }, [matchs, suivi, estParticipant, moiId, noms]);

  async function activerSuivi() {
    if (!moiId) { setMessage("Connectez-vous à Tourneo pour activer les alertes joueur."); return; }
    if (!estParticipant) { setMessage("Votre profil connecté n’est pas rattaché à ce tournoi."); return; }
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMessage("Notifications non autorisées sur cet appareil."); return; }
    }
    localStorage.setItem(`tourneo-follow-${params.id}`, "1");
    setSuivi(true);
    setMessage("Alertes activées pendant le suivi de ce tournoi.");
  }

  const classement = useMemo(() => {
    const map: Record<string,{id:string;nom:string;mj:number;v:number;n:number;d:number;diff:number;pts:number}> = {};
    equipes.forEach((e) => { if (e.id) map[e.id] = { id:e.id, nom:e.nomEquipe||e.nom||"Participant", mj:0,v:0,n:0,d:0,diff:0,pts:0 }; });
    matchs.forEach((m) => {
      if (m.score1 === "" || m.score1 === undefined || m.score2 === "" || m.score2 === undefined || !m.equipe1Id || !m.equipe2Id) return;
      const a=map[m.equipe1Id], b=map[m.equipe2Id]; if(!a||!b) return;
      const s1=Number(m.score1), s2=Number(m.score2); a.mj++; b.mj++; a.diff += s1-s2; b.diff += s2-s1;
      if(s1>s2){a.v++;a.pts+=3;b.d++;} else if(s2>s1){b.v++;b.pts+=3;a.d++;} else {a.n++;b.n++;a.pts++;b.pts++;}
    });
    return Object.values(map).sort((a,b)=>b.pts-a.pts||b.diff-a.diff);
  }, [equipes, matchs]);

  if (erreur) return <main style={s.page}><div style={s.shell}><TourneoBrand /><p>{erreur}</p></div></main>;
  if (!tournoi) return <main style={s.page}><div style={s.shell}><TourneoBrand /><p style={s.muted}>Chargement…</p></div></main>;

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <TourneoBrand compact />
          <span style={s.readonly}>Vue spectateur · lecture seule</span>
        </header>

        <section style={s.hero}>
          <span style={s.eyebrow}>Tournoi en direct</span>
          <h1 style={s.title}>{tournoi.nom}</h1>
          <p style={s.muted}>{tournoi.sport || "Multisport"} · Mise à jour automatique</p>
          {estParticipant && (
            <button style={s.follow} onClick={activerSuivi}>{suivi ? "Alertes joueur activées" : "M’alerter quand c’est à moi"}</button>
          )}
          {message && <p style={s.message}>{message}</p>}
        </section>

        <AdSlot compact />

        <div style={s.tabs}>
          <button style={onglet==="matchs"?s.tabActive:s.tab} onClick={()=>setOnglet("matchs")}>Matchs</button>
          <button style={onglet==="classement"?s.tabActive:s.tab} onClick={()=>setOnglet("classement")}>Classement</button>
          <button style={onglet==="participants"?s.tabActive:s.tab} onClick={()=>setOnglet("participants")}>Participants</button>
        </div>

        {onglet === "matchs" && <section style={s.list}>{matchs.map((m,i)=><article key={m.id??i} style={s.match}><span>{noms[m.equipe1Id||""]||"Participant"}</span><strong>{m.score1===""||m.score1===undefined?"–":m.score1} : {m.score2===""||m.score2===undefined?"–":m.score2}</strong><span>{noms[m.equipe2Id||""]||"Participant"}</span></article>)}</section>}
        {onglet === "classement" && <section style={s.list}>{classement.map((l,i)=><article key={l.id} style={s.rank}><strong>{i+1}</strong><span>{l.nom}</span><b>{l.pts} pts</b></article>)}</section>}
        {onglet === "participants" && <section style={s.grid}>{equipes.map((e,i)=><article key={e.id??i} style={s.player}>{e.photo?<img src={e.photo} alt="" style={s.avatar}/>:<div style={{...s.avatarFallback,background:e.couleur||"#3B82F6"}}>{e.emoji||"•"}</div>}<strong>{e.nomEquipe||e.nom||`Participant ${i+1}`}</strong></article>)}</section>}
      </div>
    </main>
  );
}

const s: Record<string,CSSProperties> = {
  page:{minHeight:"100vh",padding:"20px 16px 70px",background:"radial-gradient(circle at 15% 5%,rgba(124,92,255,.17),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",color:"white",fontFamily:"Inter,system-ui,sans-serif"},
  shell:{maxWidth:980,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:18},
  readonly:{padding:"7px 10px",borderRadius:999,background:"rgba(34,211,238,.07)",color:"#8DEBFF",fontSize:10,fontWeight:900},
  hero:{padding:"22px 0"},eyebrow:{color:"#72E7FF",fontSize:10,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
  title:{margin:"7px 0",fontSize:"clamp(38px,8vw,70px)",lineHeight:1},muted:{color:"#8598AF"},follow:{marginTop:12,padding:"11px 14px",borderRadius:13,border:"1px solid rgba(114,231,255,.22)",background:"rgba(114,231,255,.07)",color:"#D4FAFF",fontWeight:900,cursor:"pointer"},
  message:{color:"#A7EFFF",fontSize:12},tabs:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:6,borderRadius:18,background:"#07101E",margin:"16px 0"},
  tab:{padding:11,border:0,borderRadius:13,background:"transparent",color:"#8193AA",fontWeight:900,cursor:"pointer"},
  tabActive:{padding:11,border:0,borderRadius:13,background:"linear-gradient(135deg,rgba(124,92,255,.25),rgba(34,211,238,.11))",color:"white",fontWeight:900,cursor:"pointer"},
  list:{display:"grid",gap:9},match:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center",padding:15,borderRadius:17,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)",textAlign:"center"},
  rank:{display:"grid",gridTemplateColumns:"40px 1fr auto",gap:10,alignItems:"center",padding:14,borderRadius:16,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10},player:{display:"flex",alignItems:"center",gap:10,padding:14,borderRadius:16,background:"rgba(15,25,43,.78)",border:"1px solid rgba(148,163,184,.12)"},
  avatar:{width:42,height:42,borderRadius:13,objectFit:"cover"},avatarFallback:{width:42,height:42,borderRadius:13,display:"grid",placeItems:"center"}, 
};
