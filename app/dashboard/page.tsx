"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";

type Match = {
  score1?: string | number;
  score2?: string | number;
};

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

const LIBELLES_FORMAT: Record<string, string> = {
  complet: "Championnat",
  poules: "Poules",
  elimination: "Élimination directe",
  poulesFinale: "Poules + finale",
};

const LIBELLES_SPORT: Record<string, string> = {
  multisport: "Multisport",
  football: "Football",
  futsal: "Futsal",
  basket: "Basket-ball",
  handball: "Handball",
  volley: "Volley-ball",
  rugby7: "Rugby à 7 / Touch rugby",
  hockey: "Hockey",
  tennis: "Tennis",
  padel: "Padel",
  badminton: "Badminton",
  squash: "Squash",
  "ping-pong": "Tennis de table",
  petanque: "Pétanque",
  flechettes: "Fléchettes",
  bowling: "Bowling",
  billard: "Billard",
  babyfoot: "Baby-foot",
  cornhole: "Cornhole",
  palets: "Palets",
  molkky: "Mölkky",
  spikeball: "Roundnet / Spikeball",
  esport: "E-sport",
  echecs: "Échecs",
  dames: "Jeu de dames",
  cartes: "Jeux de cartes",
  jeuxsociete: "Jeux de société compétitifs",
  autre: "Autre sport / jeu",
};

function LogoTourneo() {
  return (
    <div style={styles.brand}>
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dashLogo" x1="4" y1="3" x2="39" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="0.5" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="40" height="40" rx="13" fill="url(#dashLogo)" />
        <circle cx="31.5" cy="10.5" r="4.3" fill="white" fillOpacity="0.2" />
        <path d="M11 12.5H31V17H23.4V30H18.6V17H11V12.5Z" fill="white" />
        <path d="M11.5 26.8C14.2 29.6 17.4 31 21 31C24.6 31 27.8 29.6 30.5 26.8" stroke="#D8F7FF" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <strong style={styles.brandName}>Tourneo</strong>
        <span style={styles.brandTag}>Tournament manager</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tournois, setTournois] = useState<Tournoi[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState<string | null>(null);
  const [profil, setProfil] = useState<{ display_name: string; player_code: string } | null>(null);
  const [pointsProfil, setPointsProfil] = useState(0);
  const [victoiresProfil, setVictoiresProfil] = useState(0);

  useEffect(() => {
    chargerTournois();
  }, []);

  async function chargerTournois() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("tournois")
      .select("id, nom, sport, created_at, donnees")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setTournois((data ?? []) as Tournoi[]);
    }

    const { data: profilData } = await supabase
      .from("profiles")
      .select("display_name, player_code")
      .eq("id", user.id)
      .maybeSingle();
    if (profilData) setProfil(profilData);

    const { data: palmares } = await supabase
      .from("player_results")
      .select("points, placement")
      .eq("profile_id", user.id);
    if (palmares) {
      setPointsProfil(palmares.reduce((total, ligne) => total + (ligne.points ?? 0), 0));
      setVictoiresProfil(palmares.filter((ligne) => ligne.placement === 1).length);
    }

    setChargement(false);
  }

  async function supprimerTournoi(id: string) {
    if (!confirm("Supprimer définitivement ce tournoi ?")) return;

    const { error } = await supabase.from("tournois").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    setTournois((actuels) => actuels.filter((tournoi) => tournoi.id !== id));
    setMenuOuvert(null);
  }

  async function renommerTournoi(tournoi: Tournoi) {
    const nouveauNom = prompt("Nouveau nom :", tournoi.nom)?.trim();
    if (!nouveauNom || nouveauNom === tournoi.nom) return;

    const { error } = await supabase
      .from("tournois")
      .update({ nom: nouveauNom })
      .eq("id", tournoi.id);

    if (error) {
      alert(error.message);
      return;
    }

    setTournois((actuels) =>
      actuels.map((item) => (item.id === tournoi.id ? { ...item, nom: nouveauNom } : item))
    );
    setMenuOuvert(null);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const resultats = useMemo(
    () => tournois.filter((tournoi) => tournoi.nom.toLowerCase().includes(recherche.toLowerCase())),
    [tournois, recherche]
  );

  const statistiques = useMemo(() => {
    const actifs = tournois.filter((tournoi) => {
      const matchs = tournoi.donnees?.matchs ?? [];
      const joues = matchs.filter((match) => match.score1 !== "" && match.score1 !== undefined && match.score2 !== "" && match.score2 !== undefined).length;
      return matchs.length > 0 && joues < matchs.length;
    }).length;

    const termines = tournois.filter((tournoi) => {
      const matchs = tournoi.donnees?.matchs ?? [];
      const joues = matchs.filter((match) => match.score1 !== "" && match.score1 !== undefined && match.score2 !== "" && match.score2 !== undefined).length;
      return matchs.length > 0 && joues === matchs.length;
    }).length;

    const participants = tournois.reduce((total, tournoi) => total + (tournoi.donnees?.equipes?.length ?? 0), 0);

    return { actifs, termines, participants };
  }, [tournois]);

  if (chargement) {
    return (
      <main style={styles.page}>
        <div style={styles.loader}><LogoTourneo /><span style={styles.muted}>Chargement de vos tournois…</span></div>
      </main>
    );
  }

  return (
    <main style={styles.page} onClick={() => menuOuvert && setMenuOuvert(null)}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.shell}>
        <header style={styles.appBar}>
          <LogoTourneo />
          <div style={styles.appBarActions}>
            <button style={styles.ghostButton} onClick={() => (window.location.href = "/aide")}>Aide</button>
            <button style={styles.ghostButton} onClick={() => (window.location.href = "/profil")}>Mon profil</button>
            <button style={styles.ghostButton} onClick={() => (window.location.href = "/contact")}>Contact</button>
            <button style={styles.ghostButton} onClick={seDeconnecter}>Déconnexion</button>
            <button style={styles.primaryButton} onClick={() => (window.location.href = "/tournoi/nouveau")}>Créer un tournoi</button>
          </div>
        </header>

        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <span style={styles.eyebrow}>Votre espace compétition</span>
            <h1 style={styles.heroTitle}>Tous vos tournois.<br />Un seul cockpit.</h1>
            <p style={styles.heroText}>Créez, relancez et suivez vos compétitions depuis un tableau de bord plus clair, plus rapide et plus vivant.</p>
          </div>

          <div style={styles.heroMetrics}>
            <div style={styles.heroMetric}><span>Tournois</span><strong>{tournois.length}</strong></div>
            <div style={styles.heroMetric}><span>En cours</span><strong>{statistiques.actifs}</strong></div>
            <div style={styles.heroMetric}><span>Terminés</span><strong>{statistiques.termines}</strong></div>
            <div style={styles.heroMetric}><span>Participants</span><strong>{statistiques.participants}</strong></div>
          </div>
        </section>

        <section style={styles.profileStrip}>
          <div>
            <span style={styles.eyebrow}>Profil joueur</span>
            <strong style={styles.profileName}>{profil?.display_name ?? "Créez votre profil Tourneo"}</strong>
            <span style={styles.muted}>{profil?.player_code ?? "Un QR personnel pour rejoindre les tournois en quelques secondes."}</span>
          </div>
          <div style={styles.profileMetrics}>
            <div><span>Points</span><strong>{pointsProfil}</strong></div>
            <div><span>Victoires</span><strong>{victoiresProfil}</strong></div>
            <button style={styles.primaryButton} onClick={() => (window.location.href = "/profil")}>Voir mon profil</button>
          </div>
        </section>

        <AdSlot label="Publicité" />

        <section style={styles.toolbar}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>⌕</span>
            <input
              style={styles.recherche}
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un tournoi"
            />
          </div>
          <span style={styles.resultCount}>{resultats.length} tournoi(x)</span>
        </section>

        {resultats.length === 0 ? (
          <section style={styles.emptyState}>
            <div style={styles.emptyMark}>T</div>
            <h2 style={{ margin: "16px 0 6px" }}>Aucun tournoi ici</h2>
            <p style={styles.muted}>Créez votre première compétition et commencez à jouer.</p>
            <button style={styles.primaryButton} onClick={() => (window.location.href = "/tournoi/nouveau")}>Créer mon premier tournoi</button>
          </section>
        ) : (
          <section style={styles.grid}>
            {resultats.map((tournoi) => {
              const equipes = tournoi.donnees?.equipes ?? [];
              const matchs = tournoi.donnees?.matchs ?? [];
              const joues = matchs.filter((match) => match.score1 !== "" && match.score1 !== undefined && match.score2 !== "" && match.score2 !== undefined).length;
              const progression = matchs.length ? Math.round((joues / matchs.length) * 100) : 0;
              const format = tournoi.donnees?.formatTournoi ?? "complet";
              const termine = matchs.length > 0 && joues === matchs.length;

              return (
                <article key={tournoi.id} style={{ ...styles.card, ...(termine ? styles.cardFinished : {}) }}>
                  <div style={styles.cardGlow} />
                  <div style={styles.cardTop}>
                    <div style={styles.badges}>
                      <span style={styles.badgePrimary}>{LIBELLES_FORMAT[format] ?? "Tournoi"}</span>
                      <span style={styles.badgeSoft}>{LIBELLES_SPORT[tournoi.sport ?? "multisport"] ?? tournoi.sport ?? "Multisport"}</span>
                      {termine && <span style={styles.badgeFinished}>Terminé</span>}
                    </div>
                    <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
                      <button style={styles.menuButton} onClick={() => setMenuOuvert(menuOuvert === tournoi.id ? null : tournoi.id)}>•••</button>
                      {menuOuvert === tournoi.id && (
                        <div style={styles.menu}>
                          <button style={styles.menuItem} onClick={() => renommerTournoi(tournoi)}>Renommer</button>
                          <button style={{ ...styles.menuItem, color: "#ff9ca7" }} onClick={() => supprimerTournoi(tournoi.id)}>Supprimer</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 style={styles.cardTitle}>{tournoi.nom}</h2>
                    <p style={styles.cardDate}>Créé le {new Date(tournoi.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>

                  <div style={styles.cardStats}>
                    <div><span>Participants</span><strong>{equipes.length}</strong></div>
                    <div><span>Matchs</span><strong>{joues}/{matchs.length}</strong></div>
                    <div><span>Statut</span><strong>{termine ? "Terminé" : matchs.length ? "En cours" : "À lancer"}</strong></div>
                  </div>

                  <div style={styles.progressBlock}>
                    <div style={styles.progressHeader}><span>Progression</span><strong>{progression}%</strong></div>
                    <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progression}%` }} /></div>
                  </div>

                  <button style={styles.openButton} onClick={() => (window.location.href = `/tournoi/${tournoi.id}`)}>Ouvrir le tournoi <span>→</span></button>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    padding: "22px 18px 70px",
    background: "radial-gradient(circle at 20% 10%,rgba(124,92,255,.13),transparent 28%),radial-gradient(circle at 82% 18%,rgba(34,211,238,.10),transparent 24%),linear-gradient(145deg,#060a14,#0a1020 46%,#07111d)",
    color: "#f8fbff",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  glowOne: { position: "fixed", width: 420, height: 420, borderRadius: "50%", background: "rgba(124,92,255,.08)", filter: "blur(80px)", top: -180, left: -130, pointerEvents: "none" },
  glowTwo: { position: "fixed", width: 460, height: 460, borderRadius: "50%", background: "rgba(34,211,238,.06)", filter: "blur(90px)", right: -180, top: 120, pointerEvents: "none" },
  shell: { width: "100%", maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 },
  appBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32 },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandName: { display: "block", fontSize: 22, letterSpacing: -.5 },
  brandTag: { display: "block", marginTop: 1, color: "#7890ae", fontSize: 11 },
  appBarActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  ghostButton: { padding: "11px 14px", borderRadius: 13, border: "1px solid rgba(148,163,184,.15)", background: "rgba(255,255,255,.025)", color: "#dce9f8", fontWeight: 750, cursor: "pointer" },
  primaryButton: { padding: "12px 17px", border: 0, borderRadius: 13, background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)", color: "white", fontWeight: 900, cursor: "pointer", boxShadow: "0 14px 34px rgba(59,130,246,.22)" },
  hero: { display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(360px,.75fr)", gap: 22, alignItems: "stretch", marginBottom: 24 },
  heroCopy: { padding: "34px 34px 32px", borderRadius: 30, background: "linear-gradient(135deg,rgba(124,92,255,.15),rgba(59,130,246,.07) 50%,rgba(34,211,238,.04))", border: "1px solid rgba(148,163,184,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.035),0 26px 70px rgba(0,0,0,.18)" },
  eyebrow: { color: "#72e7ff", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" },
  heroTitle: { margin: "12px 0 14px", fontSize: "clamp(38px,6vw,68px)", lineHeight: .97, letterSpacing: -2.7 },
  heroText: { maxWidth: 620, margin: 0, color: "#9bb0ca", fontSize: 16, lineHeight: 1.65 },
  heroMetrics: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  heroMetric: { display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 126, padding: 20, borderRadius: 24, background: "rgba(15,24,42,.75)", border: "1px solid rgba(148,163,184,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.025)" },
  profileStrip: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", padding: 20, marginBottom: 14, borderRadius: 24, background: "linear-gradient(135deg,rgba(124,92,255,.12),rgba(59,130,246,.055))", border: "1px solid rgba(148,163,184,.12)" },
  profileName: { display: "block", margin: "5px 0", fontSize: 22 },
  profileMetrics: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  partnerStrip: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "14px 18px", marginBottom: 18, borderRadius: 20, background: "rgba(34,211,238,.035)", border: "1px solid rgba(34,211,238,.10)" },
  partnerTag: { padding: "7px 10px", borderRadius: 999, color: "#7de8ff", border: "1px solid rgba(34,211,238,.14)", fontSize: 10, fontWeight: 900, letterSpacing: 1 },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 },
  searchWrap: { flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderRadius: 16, background: "rgba(8,16,31,.70)", border: "1px solid rgba(148,163,184,.13)" },
  searchIcon: { color: "#6f86a3", fontSize: 22 },
  recherche: { width: "100%", padding: "14px 0", border: 0, outline: 0, background: "transparent", color: "white", fontSize: 15 },
  resultCount: { color: "#7187a2", fontSize: 13, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 16 },
  cardFinished: { background: "linear-gradient(145deg,rgba(13,39,34,.88),rgba(15,25,43,.88))", borderColor: "rgba(52,211,153,.24)", boxShadow: "0 20px 60px rgba(16,185,129,.06)" },
  badgeFinished: { padding: "6px 9px", borderRadius: 999, background: "rgba(16,185,129,.12)", border: "1px solid rgba(52,211,153,.22)", color: "#9ff6d7", fontSize: 10, fontWeight: 900 },
  card: { position: "relative", overflow: "hidden", padding: 20, minHeight: 330, display: "flex", flexDirection: "column", gap: 18, borderRadius: 26, background: "linear-gradient(145deg,rgba(18,31,53,.94),rgba(10,20,36,.92))", border: "1px solid rgba(148,163,184,.13)", boxShadow: "0 20px 50px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025)" },
  cardGlow: { position: "absolute", width: 170, height: 170, borderRadius: "50%", background: "rgba(59,130,246,.08)", filter: "blur(36px)", right: -60, top: -60, pointerEvents: "none" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, position: "relative", zIndex: 1 },
  badges: { display: "flex", flexWrap: "wrap", gap: 7 },
  badgePrimary: { padding: "6px 9px", borderRadius: 999, background: "rgba(59,130,246,.16)", border: "1px solid rgba(96,165,250,.20)", color: "#8ec5ff", fontSize: 10, fontWeight: 900 },
  badgeSoft: { padding: "6px 9px", borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid rgba(148,163,184,.11)", color: "#9eb1c8", fontSize: 10, fontWeight: 800 },
  menuButton: { width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(148,163,184,.11)", background: "rgba(255,255,255,.03)", color: "#a9bad0", cursor: "pointer", fontWeight: 900 },
  menu: { position: "absolute", right: 0, top: 40, zIndex: 20, minWidth: 145, padding: 6, borderRadius: 14, background: "#101a2d", border: "1px solid rgba(148,163,184,.15)", boxShadow: "0 20px 45px rgba(0,0,0,.35)" },
  menuItem: { width: "100%", padding: "10px 11px", border: 0, borderRadius: 10, background: "transparent", color: "#dce8f7", textAlign: "left", cursor: "pointer", fontWeight: 750 },
  cardTitle: { margin: 0, fontSize: 27, letterSpacing: -.7 },
  cardDate: { margin: "6px 0 0", color: "#71859e", fontSize: 12 },
  cardStats: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
  progressBlock: { marginTop: "auto" },
  progressHeader: { display: "flex", justifyContent: "space-between", color: "#8ca1bc", fontSize: 12, marginBottom: 8 },
  progressTrack: { height: 8, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,.055)" },
  progressFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7C5CFF,#3B82F6,#22D3EE)", transition: "width .35s ease" },
  openButton: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "13px 14px", border: 0, borderRadius: 14, background: "linear-gradient(135deg,rgba(59,130,246,.95),rgba(34,211,238,.82))", color: "white", cursor: "pointer", fontWeight: 900 },
  emptyState: { maxWidth: 560, margin: "60px auto", textAlign: "center", padding: 44, borderRadius: 28, border: "1px solid rgba(148,163,184,.12)", background: "rgba(11,20,36,.72)" },
  emptyMark: { width: 58, height: 58, margin: "0 auto", display: "grid", placeItems: "center", borderRadius: 18, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)", fontSize: 26, fontWeight: 900 },
  muted: { color: "#8094ae" },
  loader: { minHeight: "80vh", display: "grid", placeItems: "center", alignContent: "center", gap: 12 },
};
