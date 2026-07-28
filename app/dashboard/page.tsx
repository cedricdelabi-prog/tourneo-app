"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tournoi = {
  id: string;
  nom: string;
  created_at: string;
  donnees: {
    equipes?: unknown[];
    matchs?: unknown[];
  } | null;
};

export default function DashboardPage() {
  const [tournois, setTournois] = useState<Tournoi[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerTournois();
  }, []);

  async function chargerTournois() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("tournois")
      .select("id, nom, created_at, donnees")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setTournois(data ?? []);
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
      actuels.map((item) =>
        item.id === tournoi.id ? { ...item, nom: nouveauNom } : item
      )
    );
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const resultats = tournois.filter((tournoi) =>
    tournoi.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  if (chargement) {
    return <main style={styles.page}>Chargement...</main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.conteneur}>
        <header style={styles.entete}>
          <div>
            <p style={styles.surtitre}>TOURNEO</p>
            <h1 style={styles.titre}>Mes tournois</h1>
          </div>

          <div style={styles.actions}>
            <button style={styles.secondaire} onClick={seDeconnecter}>
              Se déconnecter
            </button>

            <button
              style={styles.principal}
              onClick={() => (window.location.href = "/tournoi/nouveau")}
            >
              + Nouveau tournoi
            </button>
          </div>
        </header>

        <input
          style={styles.recherche}
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder="Rechercher un tournoi..."
        />

        {resultats.length === 0 ? (
          <section style={styles.vide}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <h2>Aucun tournoi</h2>
            <p>Crée ton premier tournoi.</p>
          </section>
        ) : (
          <section style={styles.grille}>
            {resultats.map((tournoi) => (
              <article key={tournoi.id} style={styles.carte}>
                <div>
                  <span style={styles.badge}>TOURNOI</span>
                  <h2>{tournoi.nom}</h2>
                  <p style={styles.muted}>
                    {tournoi.donnees?.equipes?.length ?? 0} équipe(s) ·{" "}
                    {tournoi.donnees?.matchs?.length ?? 0} match(s)
                  </p>
                  <p style={styles.muted}>
                    Créé le{" "}
                    {new Date(tournoi.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div style={styles.carteActions}>
                  <button
                    style={styles.ouvrir}
                    onClick={() =>
                      (window.location.href = `/tournoi/${tournoi.id}`)
                    }
                  >
                    Ouvrir
                  </button>

                  <button
                    style={styles.modifier}
                    onClick={() => renommerTournoi(tournoi)}
                  >
                    Renommer
                  </button>

                  <button
                    style={styles.supprimer}
                    onClick={() => supprimerTournoi(tournoi.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px 18px",
    background: "linear-gradient(145deg,#07101f,#0f172a 45%,#111c33)",
    color: "white",
    fontFamily: "Arial,sans-serif",
  },
  conteneur: { maxWidth: 1100, margin: "0 auto" },
  entete: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 22,
  },
  surtitre: {
    color: "#60a5fa",
    fontWeight: 900,
    letterSpacing: 2,
    fontSize: 12,
  },
  titre: { margin: 0, fontSize: "clamp(30px,5vw,48px)" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  principal: {
    padding: "12px 16px",
    border: 0,
    borderRadius: 12,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaire: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#162033",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  recherche: {
    width: "100%",
    padding: 14,
    marginBottom: 22,
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#0f172a",
    color: "white",
    fontSize: 16,
  },
  grille: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
    gap: 16,
  },
  carte: {
    padding: 20,
    borderRadius: 18,
    background: "rgba(30,41,59,.95)",
    border: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 220,
  },
  badge: {
    display: "inline-block",
    marginBottom: 12,
    padding: "5px 9px",
    borderRadius: 999,
    background: "#172554",
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: 900,
  },
  muted: { color: "#94a3b8" },
  carteActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
    marginTop: 20,
  },
  ouvrir: {
    gridColumn: "1 / -1",
    padding: 11,
    border: 0,
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  modifier: {
    padding: 10,
    border: "1px solid #475569",
    borderRadius: 10,
    background: "#1e293b",
    color: "white",
    cursor: "pointer",
  },
  supprimer: {
    padding: 10,
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    background: "#450a0a",
    color: "#fecaca",
    cursor: "pointer",
  },
  vide: {
    textAlign: "center",
    padding: 50,
    borderRadius: 20,
    border: "1px dashed #475569",
    color: "#cbd5e1",
  },
};
