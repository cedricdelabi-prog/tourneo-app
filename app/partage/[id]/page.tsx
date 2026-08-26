"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import TourneoBrand from "@/components/TourneoBrand";

type Equipe = {
  id?: string;
  userId?: string;
  profilId?: string;
  nom?: string;
  nomEquipe?: string;
  emoji?: string;
  photo?: string;
  couleur?: string;
};

type Match = {
  id?: number | string;
  journee?: number;
  equipe1Id?: string;
  equipe2Id?: string;
  score1?: string | number | null;
  score2?: string | number | null;
};

type DonneesTournoi = {
  equipes?: Equipe[];
  matchs?: Match[];
  formatTournoi?: string;
};

type Tournoi = {
  id: string;
  nom: string;
  sport?: string;
  donnees?: DonneesTournoi | string | null;
};

function scoreRenseigne(score: Match["score1"]) {
  return score !== "" && score !== undefined && score !== null;
}

function normaliserDonnees(donnees: Tournoi["donnees"]): DonneesTournoi {
  if (!donnees) return {};
  if (typeof donnees === "string") {
    try {
      return JSON.parse(donnees) as DonneesTournoi;
    } catch {
      return {};
    }
  }
  return donnees;
}

export default function PartagePage() {
  const params = useParams<{ id: string }>();
  const tournoiId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [tournoi, setTournoi] = useState<Tournoi | null>(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] =
    useState<"matchs" | "classement" | "participants">("matchs");

  const [moiId, setMoiId] = useState("");
  const [suivi, setSuivi] = useState(false);
  const [message, setMessage] = useState("");
  const derniereNotif = useRef("");

  useEffect(() => {
    if (!tournoiId) return;

    supabase.auth.getSession().then(({ data }) => {
      setMoiId(data.session?.user?.id || "");
    });

    try {
      setSuivi(localStorage.getItem(`tourneo-follow-${tournoiId}`) === "1");
    } catch {
      setSuivi(false);
    }
  }, [tournoiId]);

  useEffect(() => {
    if (!tournoiId) {
      setErreur("Lien de tournoi invalide.");
      setChargement(false);
      return;
    }

    let actif = true;

    async function charger(silencieux = false) {
      if (!silencieux) setChargement(true);

      const { data, error } = await supabase.rpc("get_tourneo_public", {
        p_id: tournoiId,
      });

      if (!actif) return;

      const ligne = Array.isArray(data) ? data[0] : data;

      if (error || !ligne) {
        setErreur(
          "Tournoi introuvable ou partage public indisponible. Vérifiez le lien ou réessayez dans quelques instants."
        );
        if (!silencieux) setChargement(false);
        return;
      }

      const resultat = ligne as Tournoi;
      setTournoi({
        ...resultat,
        donnees: normaliserDonnees(resultat.donnees),
      });
      setErreur("");
      setChargement(false);
    }

    charger();

    // Mise à jour de secours : fonctionne même si Realtime n'est pas activé côté Supabase.
    const interval = window.setInterval(() => charger(true), 4000);

    return () => {
      actif = false;
      window.clearInterval(interval);
    };
  }, [tournoiId]);

  const donnees = normaliserDonnees(tournoi?.donnees);
  const equipes = donnees.equipes ?? [];
  const matchs = donnees.matchs ?? [];

  const noms = useMemo(
    () =>
      Object.fromEntries(
        equipes
          .filter((e) => e.id)
          .map((e) => [e.id as string, e.nomEquipe || e.nom || "Participant"])
      ),
    [equipes]
  );

  // On accepte plusieurs structures de données pour reconnaître un profil joueur.
  const estParticipant = useMemo(() => {
    if (!moiId) return false;
    return equipes.some(
      (e) => e.id === moiId || e.userId === moiId || e.profilId === moiId
    );
  }, [equipes, moiId]);

  const monEquipeId = useMemo(() => {
    if (!moiId) return "";
    const equipe = equipes.find(
      (e) => e.id === moiId || e.userId === moiId || e.profilId === moiId
    );
    return equipe?.id || "";
  }, [equipes, moiId]);

  useEffect(() => {
    if (!suivi || !estParticipant || !monEquipeId) return;

    const prochain = matchs.find(
      (m) =>
        (m.equipe1Id === monEquipeId || m.equipe2Id === monEquipeId) &&
        (!scoreRenseigne(m.score1) || !scoreRenseigne(m.score2))
    );

    if (!prochain) return;

    const key = `${prochain.id ?? ""}-${prochain.equipe1Id ?? ""}-${
      prochain.equipe2Id ?? ""
    }`;

    if (derniereNotif.current === key) return;
    derniereNotif.current = key;

    const adversaire =
      prochain.equipe1Id === monEquipeId
        ? noms[prochain.equipe2Id || ""]
        : noms[prochain.equipe1Id || ""];

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Tourneo · À vous de jouer", {
        body: `Votre prochain match contre ${
          adversaire || "votre adversaire"
        } est prêt.`,
      });
    }
  }, [matchs, suivi, estParticipant, monEquipeId, noms]);

  async function activerSuivi() {
    if (!tournoiId) return;

    if (!moiId) {
      setMessage(
        "Le tournoi reste consultable sans compte. Connectez-vous seulement si vous voulez recevoir les alertes joueur."
      );
      return;
    }

    if (!estParticipant) {
      setMessage("Votre profil connecté n’est pas rattaché à ce tournoi.");
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications non autorisées sur cet appareil.");
        return;
      }
    }

    try {
      localStorage.setItem(`tourneo-follow-${tournoiId}`, "1");
    } catch {}

    setSuivi(true);
    setMessage("Alertes activées pendant le suivi de ce tournoi.");
  }

  const classement = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        nom: string;
        mj: number;
        v: number;
        n: number;
        d: number;
        diff: number;
        pts: number;
      }
    > = {};

    equipes.forEach((e) => {
      if (!e.id) return;
      map[e.id] = {
        id: e.id,
        nom: e.nomEquipe || e.nom || "Participant",
        mj: 0,
        v: 0,
        n: 0,
        d: 0,
        diff: 0,
        pts: 0,
      };
    });

    matchs.forEach((m) => {
      if (
        !scoreRenseigne(m.score1) ||
        !scoreRenseigne(m.score2) ||
        !m.equipe1Id ||
        !m.equipe2Id
      ) {
        return;
      }

      const a = map[m.equipe1Id];
      const b = map[m.equipe2Id];
      if (!a || !b) return;

      const s1 = Number(m.score1);
      const s2 = Number(m.score2);
      if (!Number.isFinite(s1) || !Number.isFinite(s2)) return;

      a.mj++;
      b.mj++;
      a.diff += s1 - s2;
      b.diff += s2 - s1;

      if (s1 > s2) {
        a.v++;
        a.pts += 3;
        b.d++;
      } else if (s2 > s1) {
        b.v++;
        b.pts += 3;
        a.d++;
      } else {
        a.n++;
        b.n++;
        a.pts++;
        b.pts++;
      }
    });

    return Object.values(map).sort(
      (a, b) => b.pts - a.pts || b.diff - a.diff || a.nom.localeCompare(b.nom)
    );
  }, [equipes, matchs]);

  const matchsTries = useMemo(
    () =>
      [...matchs].sort(
        (a, b) =>
          (a.journee ?? Number.MAX_SAFE_INTEGER) -
          (b.journee ?? Number.MAX_SAFE_INTEGER)
      ),
    [matchs]
  );

  if (erreur) {
    return (
      <main style={s.page}>
        <div style={s.shell}>
          <TourneoBrand />
          <section style={s.errorCard}>
            <strong>Impossible d’ouvrir ce tournoi</strong>
            <p style={s.muted}>{erreur}</p>
            <button style={s.retry} onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (chargement || !tournoi) {
    return (
      <main style={s.page}>
        <div style={s.shell}>
          <TourneoBrand />
          <p style={s.muted}>Chargement du tournoi…</p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <TourneoBrand compact />
          <span style={s.readonly}>LIVE · lecture seule</span>
        </header>

        <section style={s.hero}>
          <span style={s.eyebrow}>Tournoi en direct</span>
          <h1 style={s.title}>{tournoi.nom}</h1>
          <p style={s.muted}>
            {tournoi.sport || "Multisport"} · Actualisation automatique
          </p>

          {estParticipant && (
            <button style={s.follow} onClick={activerSuivi}>
              {suivi ? "Alertes joueur activées" : "M’alerter quand c’est à moi"}
            </button>
          )}

          {message && <p style={s.message}>{message}</p>}
        </section>

        <AdSlot compact />

        <div style={s.tabs}>
          <button
            style={onglet === "matchs" ? s.tabActive : s.tab}
            onClick={() => setOnglet("matchs")}
          >
            Matchs
          </button>
          <button
            style={onglet === "classement" ? s.tabActive : s.tab}
            onClick={() => setOnglet("classement")}
          >
            Classement
          </button>
          <button
            style={onglet === "participants" ? s.tabActive : s.tab}
            onClick={() => setOnglet("participants")}
          >
            Participants
          </button>
        </div>

        {onglet === "matchs" && (
          <section style={s.list}>
            {matchsTries.length === 0 ? (
              <p style={s.empty}>Aucun match n’est encore disponible.</p>
            ) : (
              matchsTries.map((m, i) => (
                <article key={String(m.id ?? i)} style={s.match}>
                  <div style={s.teamBlock}>
                    <span style={s.teamName}>
                      {noms[m.equipe1Id || ""] || "Participant"}
                    </span>
                  </div>

                  <div style={s.scoreBlock}>
                    {m.journee ? (
                      <small style={s.day}>J{m.journee}</small>
                    ) : null}
                    <strong style={s.score}>
                      {scoreRenseigne(m.score1) ? m.score1 : "–"} :{" "}
                      {scoreRenseigne(m.score2) ? m.score2 : "–"}
                    </strong>
                  </div>

                  <div style={s.teamBlock}>
                    <span style={s.teamName}>
                      {noms[m.equipe2Id || ""] || "Participant"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {onglet === "classement" && (
          <section style={s.list}>
            {classement.length === 0 ? (
              <p style={s.empty}>Le classement apparaîtra ici.</p>
            ) : (
              classement.map((l, i) => (
                <article key={l.id} style={s.rank}>
                  <strong style={s.position}>{i + 1}</strong>
                  <span>{l.nom}</span>
                  <div style={s.rankStats}>
                    <small>
                      {l.mj} MJ · diff {l.diff > 0 ? "+" : ""}
                      {l.diff}
                    </small>
                    <b>{l.pts} pts</b>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {onglet === "participants" && (
          <section style={s.grid}>
            {equipes.length === 0 ? (
              <p style={s.empty}>Aucun participant n’est encore inscrit.</p>
            ) : (
              equipes.map((e, i) => (
                <article key={e.id ?? String(i)} style={s.player}>
                  {e.photo ? (
                    <img
                      src={e.photo}
                      alt=""
                      style={s.avatar}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      style={{
                        ...s.avatarFallback,
                        background: e.couleur || "#3B82F6",
                      }}
                    >
                      {e.emoji || "•"}
                    </div>
                  )}
                  <strong>
                    {e.nomEquipe || e.nom || `Participant ${i + 1}`}
                  </strong>
                </article>
              ))
            )}
          </section>
        )}

        <footer style={s.footer}>
          Ce lien est public : aucune connexion n’est nécessaire pour suivre le tournoi.
        </footer>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "20px 16px 70px",
    background:
      "radial-gradient(circle at 15% 5%,rgba(124,92,255,.17),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",
    color: "white",
    fontFamily: "Inter,system-ui,sans-serif",
  },
  shell: { maxWidth: 980, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  readonly: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(34,211,238,.07)",
    color: "#8DEBFF",
    fontSize: 10,
    fontWeight: 900,
  },
  hero: { padding: "22px 0" },
  eyebrow: {
    color: "#72E7FF",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    margin: "7px 0",
    fontSize: "clamp(38px,8vw,70px)",
    lineHeight: 1,
  },
  muted: { color: "#8598AF" },
  follow: {
    marginTop: 12,
    padding: "11px 14px",
    borderRadius: 13,
    border: "1px solid rgba(114,231,255,.22)",
    background: "rgba(114,231,255,.07)",
    color: "#D4FAFF",
    fontWeight: 900,
    cursor: "pointer",
  },
  message: { color: "#A7EFFF", fontSize: 12 },
  tabs: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 6,
    padding: 6,
    borderRadius: 18,
    background: "#07101E",
    margin: "16px 0",
  },
  tab: {
    padding: 11,
    border: 0,
    borderRadius: 13,
    background: "transparent",
    color: "#8193AA",
    fontWeight: 900,
    cursor: "pointer",
  },
  tabActive: {
    padding: 11,
    border: 0,
    borderRadius: 13,
    background:
      "linear-gradient(135deg,rgba(124,92,255,.25),rgba(34,211,238,.11))",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  list: { display: "grid", gap: 9 },
  match: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 10,
    alignItems: "center",
    padding: 15,
    borderRadius: 17,
    background: "rgba(15,25,43,.78)",
    border: "1px solid rgba(148,163,184,.12)",
    textAlign: "center",
  },
  teamBlock: {
    minWidth: 0,
    display: "flex",
    justifyContent: "center",
  },
  teamName: {
    overflowWrap: "anywhere",
    fontWeight: 800,
  },
  scoreBlock: {
    minWidth: 66,
    display: "grid",
    gap: 3,
    justifyItems: "center",
  },
  score: { fontSize: 18, whiteSpace: "nowrap" },
  day: { color: "#72E7FF", fontWeight: 900 },
  rank: {
    display: "grid",
    gridTemplateColumns: "40px 1fr auto",
    gap: 10,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    background: "rgba(15,25,43,.78)",
    border: "1px solid rgba(148,163,184,.12)",
  },
  position: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "rgba(124,92,255,.15)",
  },
  rankStats: {
    display: "grid",
    justifyItems: "end",
    gap: 2,
    color: "#DDE7F4",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10,
  },
  player: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    background: "rgba(15,25,43,.78)",
    border: "1px solid rgba(148,163,184,.12)",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    objectFit: "cover",
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
  },
  empty: {
    margin: 0,
    padding: 18,
    borderRadius: 16,
    background: "rgba(15,25,43,.55)",
    color: "#8598AF",
    textAlign: "center",
  },
  errorCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    background: "rgba(15,25,43,.78)",
    border: "1px solid rgba(248,113,113,.22)",
  },
  retry: {
    padding: "10px 13px",
    borderRadius: 12,
    border: 0,
    background: "white",
    color: "#09111F",
    fontWeight: 900,
    cursor: "pointer",
  },
  footer: {
    marginTop: 26,
    color: "#60748D",
    fontSize: 11,
    textAlign: "center",
  },
};
