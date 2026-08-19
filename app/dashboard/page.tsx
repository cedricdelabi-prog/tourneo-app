"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import TourneoNav from "@/components/TourneoNav";

type Match = { score1?: string | number; score2?: string | number };
type Tournoi = {
  id: string;
  nom: string;
  sport?: string;
  created_at: string;
  donnees: {
    equipes?: unknown[];
    matchs?: Match[];
    formatTournoi?: "complet" | "poules" | "elimination" | "poulesFinale";
    cree?: boolean;
  } | null;
};

const FORMAT: Record<string,string> = { complet:"Championnat", poules:"Poules", elimination:"Élimination directe", poulesFinale:"Poules + finale" };
const SPORT: Record<string,string> = {
  multisport:"Multisport", football:"Football", futsal:"Futsal", basket:"Basket-ball", handball:"Handball", volley:"Volley-ball",
  rugby7:"Rugby à 7 / Touch", hockey:"Hockey", tennis:"Tennis", padel:"Padel", badminton:"Badminton", squash:"Squash",
  "ping-pong":"Tennis de table", petanque:"Pétanque", flechettes:"Fléchettes", bowling:"Bowling", billard:"Billard",
  babyfoot:"Baby-foot", cornhole:"Cornhole", palets:"Palets", molkky:"Mölkky", spikeball:"Roundnet", esport:"E-sport",
  echecs:"Échecs", dames:"Jeu de dames", cartes:"Jeux de cartes", jeuxsociete:"Jeux de société", autre:"Autre"
};

export default function DashboardPage() {
  const [tournois, setTournois] = useState<Tournoi[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous"|"encours"|"termines">("tous");
  const [chargement, setChargement] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState<string | null>(null);

  useEffect(() => { charger(); }, []);

  async function charger() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) { window.location.href = "/login"; return; }

    const { data, error } = await supabase
      .from("tournois")
      .select("id, nom, sport, created_at, donnees")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) alert(error.message);
    else setTournois((data ?? []) as Tournoi[]);
    setChargement(false);
  }

  function etat(t: Tournoi) {
    const matchs = t.donnees?.matchs ?? [];
    const joues = matchs.filter((m) => m.score1 !== "" && m.score1 !== undefined && m.score2 !== "" && m.score2 !== undefined).length;
    const termine = matchs.length > 0 && joues === matchs.length;
    return { matchs, joues, termine, progression: matchs.length ? Math.round((joues / matchs.length) * 100) : 0 };
  }

  async function supprimerTournoi(id: string) {
    if (!confirm("Supprimer définitivement ce tournoi ?")) return;
    const { error } = await supabase.from("tournois").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setTournois((list) => list.filter((t) => t.id !== id));
    setMenuOuvert(null);
  }

  async function renommerTournoi(t: Tournoi) {
    const brut = prompt("Nouveau nom :", t.nom)?.trim();
    if (!brut) return;
    const nom = brut.charAt(0).toUpperCase() + brut.slice(1);
    const { error } = await supabase.from("tournois").update({ nom }).eq("id", t.id);
    if (error) { alert(error.message); return; }
    setTournois((list) => list.map((x) => x.id === t.id ? { ...x, nom } : x));
    setMenuOuvert(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const stats = useMemo(() => {
    const termines = tournois.filter((t) => etat(t).termine).length;
    const encours = tournois.filter((t) => {
      const e = etat(t); return e.matchs.length > 0 && !e.termine;
    }).length;
    const participants = tournois.reduce((sum,t) => sum + (t.donnees?.equipes?.length ?? 0), 0);
    return { termines, encours, participants };
  }, [tournois]);

  const resultats = useMemo(() => {
    return tournois.filter((t) => {
      const e = etat(t);
      const rechercheOk = t.nom.toLowerCase().includes(recherche.toLowerCase());
      const filtreOk = filtre === "tous" || (filtre === "termines" ? e.termine : e.matchs.length > 0 && !e.termine);
      return rechercheOk && filtreOk;
    });
  }, [tournois, recherche, filtre]);

  if (chargement) return <main style={s.page}><div style={s.loader}>Chargement de vos tournois…</div></main>;

  return (
    <main style={s.page} onClick={() => menuOuvert && setMenuOuvert(null)}>
      <div style={s.shell}>
        <TourneoNav active="dashboard" onLogout={logout} primaryLabel="Créer un tournoi" primaryHref="/tournoi/nouveau" />

        <section style={s.createHero}>
          <div>
            <span style={s.eyebrow}>Créer maintenant</span>
            <h1 style={s.title}>Lancez votre prochain tournoi.</h1>
            <p style={s.muted}>Configurez le format, ajoutez les participants et partagez les résultats depuis un seul endroit.</p>
          </div>
          <button style={s.bigCreate} onClick={() => (window.location.href = "/tournoi/nouveau")}>Créer un tournoi →</button>
        </section>

        <section style={s.metrics}>
          <div><span>Tournois</span><strong>{tournois.length}</strong></div>
          <div><span>En cours</span><strong>{stats.encours}</strong></div>
          <div><span>Terminés</span><strong>{stats.termines}</strong></div>
          <div><span>Participants</span><strong>{stats.participants}</strong></div>
        </section>

        <AdSlot label="Publicité" compact />

        <section style={s.toolbar}>
          <input style={s.search} value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un tournoi" />
          <div style={s.filters}>
            {(["tous","encours","termines"] as const).map((f) => (
              <button key={f} onClick={() => setFiltre(f)} style={{ ...s.filter, ...(filtre === f ? s.filterActive : {}) }}>
                {f === "tous" ? "Tous" : f === "encours" ? "En cours" : "Terminés"}
              </button>
            ))}
          </div>
        </section>

        <section style={s.grid}>
          {resultats.map((t) => {
            const e = etat(t);
            const format = t.donnees?.formatTournoi ?? "complet";
            return (
              <article key={t.id} style={{ ...s.card, ...(e.termine ? s.cardFinished : {}) }}>
                <div style={s.cardTop}>
                  <div style={s.badges}>
                    <span style={s.badge}>{FORMAT[format]}</span>
                    <span style={s.badgeSoft}>{SPORT[t.sport ?? "multisport"] ?? t.sport}</span>
                    {e.termine && <span style={s.finishedBadge}>CLÔTURÉ</span>}
                  </div>
                  <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
                    <button style={s.menu} onClick={() => setMenuOuvert(menuOuvert === t.id ? null : t.id)}>•••</button>
                    {menuOuvert === t.id && (
                      <div style={s.menuPanel}>
                        <button onClick={() => renommerTournoi(t)}>Renommer</button>
                        <button onClick={() => supprimerTournoi(t.id)}>Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>

                <h2 style={s.cardTitle}>{t.nom}</h2>
                <p style={s.date}>Créé le {new Date(t.created_at).toLocaleDateString("fr-FR")}</p>

                <div style={s.cardStats}>
                  <span><b>{t.donnees?.equipes?.length ?? 0}</b> participants</span>
                  <span><b>{e.joues}/{e.matchs.length}</b> matchs</span>
                </div>

                <div style={s.progressLabel}><span>Progression</span><strong>{e.progression}%</strong></div>
                <div style={s.progress}><div style={{ ...s.progressFill, width: `${e.progression}%`, ...(e.termine ? s.progressFinished : {}) }} /></div>

                <button style={{ ...s.open, ...(e.termine ? s.openFinished : {}) }} onClick={() => (window.location.href = `/tournoi/${t.id}`)}>
                  {e.termine ? "Voir les résultats" : "Ouvrir le tournoi"} →
                </button>
              </article>
            );
          })}
        </section>

        {resultats.length === 0 && <div style={s.empty}>Aucun tournoi ne correspond à ce filtre.</div>}
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "22px 18px 90px", background: "radial-gradient(circle at 12% 6%,rgba(124,92,255,.17),transparent 26%),radial-gradient(circle at 87% 8%,rgba(34,211,238,.08),transparent 24%),linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1120, margin: "0 auto" },
  loader: { minHeight: "70vh", display: "grid", placeItems: "center", color: "#8FA1B8" },
  createHero: { display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center", padding: 26, borderRadius: 28, background: "linear-gradient(135deg,rgba(124,92,255,.20),rgba(59,130,246,.10),rgba(34,211,238,.06))", border: "1px solid rgba(114,231,255,.16)", marginBottom: 14 },
  eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { margin: "7px 0", fontSize: "clamp(34px,6vw,62px)", lineHeight: 1.02 },
  muted: { color: "#8799AF", lineHeight: 1.55 },
  bigCreate: { padding: "15px 19px", borderRadius: 16, border: 0, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)", color: "white", fontWeight: 1000, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 },
  cardStats: { display: "flex", justifyContent: "space-between", gap: 10, color: "#9CB0C7", fontSize: 13, flexWrap: "wrap" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "16px 0", flexWrap: "wrap" },
  search: { flex: "1 1 260px", padding: 13, borderRadius: 14, border: "1px solid rgba(148,163,184,.15)", background: "#07101E", color: "white" },
  filters: { display: "flex", gap: 6, flexWrap: "wrap" },
  filter: { padding: "10px 12px", borderRadius: 999, border: "1px solid rgba(148,163,184,.12)", background: "rgba(255,255,255,.025)", color: "#8294AA", cursor: "pointer", fontWeight: 800 },
  filterActive: { color: "white", background: "rgba(124,92,255,.18)", borderColor: "rgba(114,231,255,.22)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))", gap: 14 },
  card: { minWidth: 0, position: "relative", padding: 18, borderRadius: 24, background: "linear-gradient(160deg,rgba(28,47,78,.84),rgba(12,23,41,.96))", border: "1px solid rgba(91,132,190,.24)", boxShadow: "0 16px 44px rgba(0,0,0,.20)", overflow: "hidden" },
  cardFinished: { background: "linear-gradient(160deg,rgba(50,42,73,.92),rgba(15,18,30,.98))", border: "1px solid rgba(217,180,94,.34)", boxShadow: "inset 0 0 0 1px rgba(217,180,94,.05),0 14px 40px rgba(0,0,0,.24)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 },
  badges: { display: "flex", gap: 6, flexWrap: "wrap" },
  badge: { padding: "5px 8px", borderRadius: 999, background: "rgba(34,211,238,.10)", color: "#8DEBFF", fontSize: 10, fontWeight: 900 },
  badgeSoft: { padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.055)", color: "#A6B5C9", fontSize: 10, fontWeight: 800 },
  finishedBadge: { padding: "5px 8px", borderRadius: 999, background: "linear-gradient(135deg,#C89035,#E7C46D)", color: "#17120A", fontSize: 9, fontWeight: 1000, letterSpacing: .7 },
  menu: { border: 0, borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#C5D0DD", cursor: "pointer", padding: "6px 9px" },
  menuPanel: { position: "absolute", right: 0, top: 34, zIndex: 30, width: 130, display: "grid", gap: 4, padding: 6, borderRadius: 13, background: "#0B1424", border: "1px solid rgba(148,163,184,.16)" },
  cardTitle: { fontSize: 25, margin: "18px 0 3px", overflowWrap: "anywhere" },
  date: { color: "#7F91A8", fontSize: 12 },
  progressLabel: { display: "flex", justifyContent: "space-between", margin: "18px 0 7px", color: "#8396AD", fontSize: 11 },
  progress: { height: 8, borderRadius: 999, background: "#07101E", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#3B82F6,#22D3EE)", transition: "width .25s ease" },
  progressFinished: { background: "linear-gradient(90deg,#B47A25,#F0D48A)" },
  open: { width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#3B82F6,#22D3EE)", color: "white", fontWeight: 1000, cursor: "pointer" },
  openFinished: { background: "linear-gradient(135deg,#B47A25,#E8C56C)", color: "#18120A" },
  empty: { marginTop: 20, padding: 30, textAlign: "center", color: "#8192A8", border: "1px dashed rgba(148,163,184,.14)", borderRadius: 20 },
};

Object.assign(s.metrics, {});
