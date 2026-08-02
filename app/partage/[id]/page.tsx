"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournoi = {
  id: string;
  nom: string;
  sport: string;
  donnees: {
    equipes?: Array<{
      id?: string;
      nom?: string;
      nomEquipe?: string;
      emoji?: string;
      photo?: string;
    }>;
    matchs?: Array<{
      id?: string;
      equipe1?: string;
      equipe2?: string;
      equipe1Id?: string;
      equipe2Id?: string;
      score1?: number;
      score2?: number;
    }>;
  };
};

export default function PartagePage() {
  const params = useParams<{ id: string }>();

  const [tournoi, setTournoi] = useState<Tournoi | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function chargerTournoi() {
      const { data, error } = await supabase
        .from("tournois")
        .select("id, nom, sport, donnees")
        .eq("id", params.id)
        .eq("est_public", true)
        .single();

      if (error) {
        console.error(error);
        setErreur("Ce tournoi est introuvable ou n’est pas public.");
        setChargement(false);
        return;
      }

      setTournoi(data as Tournoi);
      setChargement(false);
    }

    chargerTournoi();

    const intervalle = window.setInterval(chargerTournoi, 5000);

    return () => window.clearInterval(intervalle);
  }, [params.id]);

  if (chargement) {
    return (
      <main style={styles.centre}>
        <p>Chargement du tournoi…</p>
      </main>
    );
  }

  if (erreur || !tournoi) {
    return (
      <main style={styles.centre}>
        <h1>Tourneo</h1>
        <p>{erreur}</p>
      </main>
    );
  }

  const equipes = tournoi.donnees?.equipes ?? [];
  const matchs = tournoi.donnees?.matchs ?? [];

  function trouverNomEquipe(id?: string) {
    const equipe = equipes.find((element) => element.id === id);

    return (
      equipe?.nomEquipe ||
      equipe?.nom ||
      id ||
      "Équipe"
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.entete}>
        <p style={styles.surtitre}>TOURNOI EN DIRECT</p>
        <h1 style={styles.titre}>🏆 {tournoi.nom}</h1>
        <p style={styles.sport}>{tournoi.sport || "Multisport"}</p>
        <p style={styles.actualisation}>
          Mise à jour automatique toutes les 5 secondes
        </p>
      </header>

      <section style={styles.bloc}>
        <h2>Équipes</h2>

        {equipes.length === 0 ? (
          <p style={styles.texteSecondaire}>Aucune équipe enregistrée.</p>
        ) : (
          <div style={styles.grille}>
            {equipes.map((equipe, index) => (
              <article key={equipe.id || index} style={styles.carte}>
                <span style={styles.emoji}>{equipe.emoji || "🏅"}</span>

                <strong>
                  {equipe.nomEquipe ||
                    equipe.nom ||
                    `Équipe ${index + 1}`}
                </strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={styles.bloc}>
        <h2>Matchs et résultats</h2>

        {matchs.length === 0 ? (
          <p style={styles.texteSecondaire}>Aucun match disponible.</p>
        ) : (
          <div style={styles.liste}>
            {matchs.map((match, index) => {
              const equipe1 =
                match.equipe1 ||
                trouverNomEquipe(match.equipe1Id);

              const equipe2 =
                match.equipe2 ||
                trouverNomEquipe(match.equipe2Id);

              return (
                <article key={match.id || index} style={styles.match}>
                  <span style={styles.nomEquipe}>{equipe1}</span>

                  <div style={styles.score}>
                    <strong>{match.score1 ?? "-"}</strong>
                    <span>–</span>
                    <strong>{match.score2 ?? "-"}</strong>
                  </div>

                  <span style={styles.nomEquipe}>{equipe2}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 20,
    background: "#081225",
    color: "white",
  },
  centre: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    background: "#081225",
    color: "white",
    textAlign: "center",
  },
  entete: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto 24px",
  },
  surtitre: {
    color: "#60a5fa",
    fontWeight: 800,
    letterSpacing: 2,
  },
  titre: {
    margin: "8px 0",
    fontSize: 38,
  },
  sport: {
    color: "#cbd5e1",
    fontSize: 18,
  },
  actualisation: {
    color: "#22c55e",
    fontSize: 14,
  },
  bloc: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto 22px",
    padding: 22,
    borderRadius: 18,
    background: "#162238",
    border: "1px solid #334155",
  },
  grille: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  carte: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    background: "#0f1a2e",
  },
  emoji: {
    fontSize: 28,
  },
  liste: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  match: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    background: "#0f1a2e",
    textAlign: "center",
  },
  nomEquipe: {
    fontWeight: 700,
  },
  score: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 22,
  },
  texteSecondaire: {
    color: "#94a3b8",
  },
};