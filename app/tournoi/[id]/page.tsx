"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import TeamAvatar from "@/components/TeamAvatar";
import TeamCard from "@/components/TeamCard";
import TeamModal from "@/components/TeamModal";
import { calculerClassement, genererMatchs } from "@/lib/tournoi";
import type { Equipe, Match } from "@/types";
import { supabase } from "@/lib/supabase";

const CLE = "tourneo-v03";

export default function TournoiPage() {
  const params = useParams<{ id: string }>();
  const [nomTournoi, setNomTournoi] = useState("");
  const [sport, setSport] = useState("multisport");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [cree, setCree] = useState(false);
  const [pret, setPret] = useState(false);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [onglet, setOnglet] = useState<"matchs" | "classement" | "statistiques">("matchs");
  const [lienPartage, setLienPartage] = useState("");
  const [qrOuvert, setQrOuvert] = useState(false);
  const [userId, setUserId] = useState("");
  const [tournoiId, setTournoiId] = useState("");
  const [messageCloud, setMessageCloud] = useState("");

  useEffect(() => {
    setLienPartage(`${window.location.origin}/partage/${params.id}`);
    async function initialiser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      if (params.id === "nouveau") {
        setPret(true);
        setMessageCloud("");
        return;
      }

      setMessageCloud("Chargement depuis Supabase...");

      const { data: tournoiCloud, error } = await supabase
        .from("tournois")
        .select("id, nom, donnees")
        .eq("user_id", user.id)
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setMessageCloud("Cloud indisponible, chargement local.");
      }

      if (tournoiCloud) {
        const donnees = tournoiCloud.donnees ?? {};
        setTournoiId(tournoiCloud.id);
        setNomTournoi(tournoiCloud.nom ?? "");
        setEquipes(donnees.equipes ?? []);
        setMatchs(donnees.matchs ?? []);
        setCree(Boolean(donnees.cree));
        setMessageCloud("Synchronisé avec Supabase ✅");
      } else {
        const brut = localStorage.getItem(CLE);

        if (brut) {
          try {
            const data = JSON.parse(brut);
            setNomTournoi(data.nomTournoi ?? "");
            setEquipes(data.equipes ?? []);
            setMatchs(data.matchs ?? []);
            setCree(Boolean(data.cree));
            setTournoiId(data.tournoiId ?? "");
          } catch {
            localStorage.removeItem(CLE);
          }
        }

        setMessageCloud("");
      }

      setPret(true);
    }

    initialiser();
  }, [params.id]);

  useEffect(() => {
    if (!pret) return;

    localStorage.setItem(
      CLE,
      JSON.stringify({ nomTournoi, equipes, matchs, cree, tournoiId })
    );

    if (!tournoiId || !userId) return;

    const minuterie = window.setTimeout(async () => {
      setMessageCloud("Synchronisation...");

      const { error } = await supabase
        .from("tournois")
        .update({
          nom: nomTournoi.trim() || "Tournoi sans nom",
          donnees: {
            equipes,
            matchs,
            cree,
          },
        })
        .eq("id", tournoiId)
        .eq("user_id", userId);

      if (error) {
        console.error(error);
        setMessageCloud("Erreur de synchronisation.");
      } else {
        setMessageCloud("Synchronisé avec Supabase ✅");
      }
    }, 500);

    return () => window.clearTimeout(minuterie);
  }, [nomTournoi, equipes, matchs, cree, tournoiId, userId, pret]);


  const classement = useMemo(
    () => calculerClassement(equipes, matchs),
    [equipes, matchs]
  );

  const podium = classement.slice(0, 3);
  const journees = [...new Set(matchs.map((match) => match.journee))];
  const joues = matchs.filter(
    (match) => match.score1 !== "" && match.score2 !== ""
  ).length;

  const progression = matchs.length
    ? Math.round((joues / matchs.length) * 100)
    : 0;

  const leader = classement[0];
  const meilleureAttaque = [...classement].sort(
    (a, b) => b.pour - a.pour
  )[0];
  const meilleureDefense = [...classement]
    .filter((ligne) => ligne.mj > 0)
    .sort((a, b) => a.contre - b.contre)[0];
  const meilleurRatio = [...classement]
    .filter((ligne) => ligne.mj > 0)
    .sort(
      (a, b) =>
        b.v / Math.max(b.mj, 1) - a.v / Math.max(a.mj, 1)
    )[0];

  function ajouterEquipe(equipe: Equipe) {
    if (
      equipes.some(
        (item) => item.nom.toLowerCase() === equipe.nom.toLowerCase()
      )
    ) {
      alert("Une équipe porte déjà ce nom.");
      return;
    }

    setEquipes((actuelles) => [...actuelles, equipe]);
  }

  async function lancerTournoi() {
    if (!nomTournoi.trim()) {
      alert("Ajoute un nom au tournoi.");
      return;
    }

    if (equipes.length < 2) {
      alert("Ajoute au moins deux équipes.");
      return;
    }

    if (!userId) {
      alert("Utilisateur non connecté.");
      window.location.href = "/login";
      return;
    }

    setMessageCloud("Enregistrement dans le cloud...");
    const matchsGeneres = genererMatchs(equipes);

    const { data, error } = await supabase
      .from("tournois")
      .insert({

        nom: nomTournoi.trim(),
        sport,
        user_id: userId,
        donnees: {
          equipes,
          matchs: matchsGeneres,
          cree: true,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setMessageCloud("Erreur lors de l’enregistrement du tournoi.");
      alert(error.message);
      return;
    }

    setTournoiId(data.id);
    setMatchs(matchsGeneres);
    setCree(true);
    setMessageCloud("Tournoi enregistré dans Supabase ✅");
  }

  function changerScore(
    id: number,
    champ: "score1" | "score2",
    valeur: string
  ) {
    setMatchs((actuels) =>
      actuels.map((match) =>
        match.id === id ? { ...match, [champ]: valeur } : match
      )
    );
  }

  function trouverEquipe(id: string) {
    return equipes.find((equipe) => equipe.id === id)!;
  }

  async function seDeconnecter() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Impossible de se déconnecter pour le moment.");
      return;
    }

    window.location.href = "/login";
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lienPartage);
      alert("Lien copié !");
    } catch {
      prompt("Copie ce lien :", lienPartage);
    }
  }

  async function partagerTournoi() {
    if (navigator.share) {
      await navigator.share({
        title: nomTournoi,
        text: `Suis le tournoi ${nomTournoi} sur Tourneo`,
        url: lienPartage,
      });
      return;
    }

    await copierLien();
  }

  function exporterPDF() {
    window.print();
  }

  async function recommencer() {
    if (!confirm("Supprimer le tournoi actuel ?")) return;

    if (tournoiId) {
      const { error } = await supabase
        .from("tournois")
        .delete()
        .eq("id", tournoiId);

      if (error) {
        console.error(error);
        alert("La suppression dans le cloud a échoué.");
      }
    }

    localStorage.removeItem(CLE);
    setNomTournoi("");
    setEquipes([]);
    setMatchs([]);
    setTournoiId("");
    setMessageCloud("");
    setCree(false);
    setOnglet("matchs");
    window.location.href = "/dashboard";
  }

  if (!pret) return <main style={styles.page}>Chargement...</main>;

  if (!cree) {
    return (
      <main style={styles.page}>
        <div style={styles.topActions}>
          <button
            style={styles.retourDashboard}
            onClick={() => (window.location.href = "/dashboard")}
          >
            Mes tournois
          </button>
          <button style={styles.deconnexion} onClick={seDeconnecter}>
            Se déconnecter
          </button>
        </div>

        <section style={styles.creation}>
          <div style={styles.logo}>🏆</div>
          <p style={styles.surtitre}>TOURNEO V0.3</p>
          <h1 style={styles.titre}>Crée ton tournoi</h1>

          <label style={styles.label}>Nom du tournoi</label>
          <input
            style={styles.input}
            value={nomTournoi}
            onChange={(e) => setNomTournoi(e.target.value)}
            placeholder="Ex : Tournoi du camping"
          /><label style={styles.label}>Sport</label>

<select
  style={{
    ...styles.input,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  }}
  value={sport}
  onChange={(e) => setSport(e.target.value)}
>
  <option value="multisport">🏆 Multisport</option>
  <option value="football">⚽ Football</option>
  <option value="basket">🏀 Basket</option>
  <option value="tennis">🎾 Tennis</option>
  <option value="ping-pong">🏓 Ping-pong</option>
  <option value="padel">🎾 Padel</option>
  <option value="petanque">🔵 Pétanque</option>
  <option value="handball">🤾 Handball</option>
  <option value="volley">🏐 Volley</option>
  <option value="badminton">🏸 Badminton</option>
  <option value="flechettes">🎯 Fléchettes</option>
  <option value="autre">🏅 Autre</option>
</select>
          <div style={styles.ligneTitre}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Équipes</h2>
              <span style={styles.muted}>{equipes.length} ajoutée(s)</span>
            </div>

            <button
              style={styles.ajouter}
              onClick={() => setModalOuvert(true)}
            >
              + Ajouter
            </button>
          </div>

          <div style={styles.listeEquipes}>
            {equipes.length === 0 ? (
              <div style={styles.vide}>
                Ajoute une équipe avec une photo ou un emoji.
              </div>
            ) : (
              equipes.map((equipe) => (
                <TeamCard
                  key={equipe.id}
                  equipe={equipe}
                  onSupprimer={() =>
                    setEquipes((actuelles) =>
                      actuelles.filter((item) => item.id !== equipe.id)
                    )
                  }
                />
              ))
            )}
          </div>

          <button style={styles.principal} onClick={lancerTournoi}>
            Générer le tournoi
          </button>

          {messageCloud && (
            <p style={styles.messageCloud}>{messageCloud}</p>
          )}
        </section>

        <TeamModal
          ouvert={modalOuvert}
          onFermer={() => setModalOuvert(false)}
          onAjouter={ajouterEquipe}
        />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.topActions}>
        <button
          style={styles.retourDashboard}
          onClick={() => (window.location.href = "/dashboard")}
        >
          Mes tournois
        </button>
        <button style={styles.deconnexion} onClick={seDeconnecter}>
          Se déconnecter
        </button>
      </div>

      <div style={styles.conteneur}>
        <header style={styles.entete}>
          <div>
            <p style={styles.surtitre}>TOURNOI EN COURS</p>
            <h1 style={styles.grandTitre}>🏆 {nomTournoi}</h1>
            <span style={styles.muted}>
              {equipes.length} équipes · {joues}/{matchs.length} matchs joués
            </span>
            {messageCloud && (
              <div style={styles.cloudBadge}>{messageCloud}</div>
            )}
          </div>

          <div style={styles.actionsTournoi}>
            <button style={styles.partager} onClick={partagerTournoi}>
              Partager
            </button>
            <button style={styles.partager} onClick={() => setQrOuvert(true)}>
              QR Code
            </button>
            <button style={styles.partager} onClick={exporterPDF}>
              Export PDF
            </button>
            <button style={styles.secondaire} onClick={recommencer}>
              Nouveau tournoi
            </button>
          </div>
        </header>

        <section style={styles.progressionCard}>
          <div style={styles.progressionEntete}>
            <strong>Progression du tournoi</strong>
            <span>{progression}%</span>
          </div>
          <div style={styles.progressionFond}>
            <div
              style={{
                ...styles.progressionBarre,
                width: `${progression}%`,
              }}
            />
          </div>
          <span style={styles.muted}>
            {joues} match(s) joué(s) sur {matchs.length}
          </span>
        </section>

        <nav style={styles.nav}>
          <button
            style={{
              ...styles.onglet,
              ...(onglet === "matchs" ? styles.actif : {}),
            }}
            onClick={() => setOnglet("matchs")}
          >
            ⚔️ Matchs
          </button>
          <button
            style={{
              ...styles.onglet,
              ...(onglet === "classement" ? styles.actif : {}),
            }}
            onClick={() => setOnglet("classement")}
          >
            🏆 Classement
          </button>
          <button
            style={{
              ...styles.onglet,
              ...(onglet === "statistiques" ? styles.actif : {}),
            }}
            onClick={() => setOnglet("statistiques")}
          >
            📊 Statistiques
          </button>
        </nav>

        {onglet === "matchs" &&
          journees.map((journee) => (
            <section key={journee} style={styles.section}>
              <h2>Journée {journee}</h2>

              <div style={styles.matchs}>
                {matchs
                  .filter((match) => match.journee === journee)
                  .map((match) => {
                    const equipe1 = trouverEquipe(match.equipe1Id);
                    const equipe2 = trouverEquipe(match.equipe2Id);
                    const fini =
                      match.score1 !== "" && match.score2 !== "";

                    return (
                      <article
                        key={match.id}
                        style={{
                          ...styles.match,
                          borderColor: fini ? "#22c55e" : "#334155",
                        }}
                      >
                        <div style={styles.equipeGauche}>
                          <TeamAvatar equipe={equipe1} taille={42} />
                          <strong>{equipe1.nom}</strong>
                        </div>

                        <input
                          style={styles.score}
                          type="number"
                          min="0"
                          value={match.score1}
                          onChange={(e) =>
                            changerScore(match.id, "score1", e.target.value)
                          }
                        />

                        <span>–</span>

                        <input
                          style={styles.score}
                          type="number"
                          min="0"
                          value={match.score2}
                          onChange={(e) =>
                            changerScore(match.id, "score2", e.target.value)
                          }
                        />

                        <div style={styles.equipeDroite}>
                          <strong>{equipe2.nom}</strong>
                          <TeamAvatar equipe={equipe2} taille={42} />
                        </div>
                      </article>
                    );
                  })}
              </div>
            </section>
          ))}

        {onglet === "classement" && (
          <>
            {podium.length >= 3 && (
              <section style={styles.section}>
                <h2>{joues === matchs.length && matchs.length > 0 ? "Podium final" : "Podium provisoire"}</h2>

                <div style={styles.podium}>
                  {[podium[1], podium[0], podium[2]].map((ligne, index) => {
                    const rang = index === 0 ? 2 : index === 1 ? 1 : 3;
                    return (
                      <div style={styles.podiumColonne} key={ligne.equipe.id}>
                        <TeamAvatar equipe={ligne.equipe} taille={64} />
                        <strong>{ligne.equipe.nom}</strong>
                        <span style={styles.muted}>{ligne.pts} pts</span>
                        <div
                          style={{
                            ...styles.marche,
                            height: rang === 1 ? 145 : rang === 2 ? 105 : 80,
                            background:
                              rang === 1
                                ? "#ca8a04"
                                : rang === 2
                                ? "#64748b"
                                : "#92400e",
                          }}
                        >
                          {rang}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section style={styles.section}>
              <h2>Classement complet</h2>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Équipe</th>
                      <th>MJ</th>
                      <th>V</th>
                      <th>N</th>
                      <th>D</th>
                      <th>Diff.</th>
                      <th>Pts</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classement.map((ligne, index) => (
                      <tr key={ligne.equipe.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div style={styles.nomClassement}>
                            <TeamAvatar equipe={ligne.equipe} taille={38} />
                            <strong>{ligne.equipe.nom}</strong>
                          </div>
                        </td>
                        <td>{ligne.mj}</td>
                        <td>{ligne.v}</td>
                        <td>{ligne.n}</td>
                        <td>{ligne.d}</td>
                        <td>
                          {ligne.diff > 0 ? "+" : ""}
                          {ligne.diff}
                        </td>
                        <td style={{ color: "#60a5fa", fontWeight: 900 }}>
                          {ligne.pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {onglet === "statistiques" && (
          <>
            <section style={styles.statsGrille}>
              <article style={styles.statCarte}>
                <span style={styles.statIcone}>⭐</span>
                <span style={styles.statLabel}>MVP du tournoi</span>
                <strong style={styles.statValeur}>
                  {leader ? leader.equipe.nom : "À déterminer"}
                </strong>
                <span style={styles.muted}>
                  {leader ? `${leader.pts} points` : "Aucun résultat"}
                </span>
              </article>

              <article style={styles.statCarte}>
                <span style={styles.statIcone}>🔥</span>
                <span style={styles.statLabel}>Meilleure attaque</span>
                <strong style={styles.statValeur}>
                  {meilleureAttaque
                    ? meilleureAttaque.equipe.nom
                    : "À déterminer"}
                </strong>
                <span style={styles.muted}>
                  {meilleureAttaque
                    ? `${meilleureAttaque.pour} points marqués`
                    : "Aucun résultat"}
                </span>
              </article>

              <article style={styles.statCarte}>
                <span style={styles.statIcone}>🛡️</span>
                <span style={styles.statLabel}>Meilleure défense</span>
                <strong style={styles.statValeur}>
                  {meilleureDefense
                    ? meilleureDefense.equipe.nom
                    : "À déterminer"}
                </strong>
                <span style={styles.muted}>
                  {meilleureDefense
                    ? `${meilleureDefense.contre} points encaissés`
                    : "Aucun résultat"}
                </span>
              </article>

              <article style={styles.statCarte}>
                <span style={styles.statIcone}>📈</span>
                <span style={styles.statLabel}>Meilleur taux de victoire</span>
                <strong style={styles.statValeur}>
                  {meilleurRatio
                    ? meilleurRatio.equipe.nom
                    : "À déterminer"}
                </strong>
                <span style={styles.muted}>
                  {meilleurRatio
                    ? `${Math.round(
                        (meilleurRatio.v / meilleurRatio.mj) * 100
                      )}% de victoires`
                    : "Aucun résultat"}
                </span>
              </article>
            </section>

            <section style={styles.section}>
              <h2>Statistiques détaillées</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Équipe</th>
                      <th>Matchs</th>
                      <th>Victoires</th>
                      <th>Nuls</th>
                      <th>Défaites</th>
                      <th>Pour</th>
                      <th>Contre</th>
                      <th>Différence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classement.map((ligne) => (
                      <tr key={ligne.equipe.id}>
                        <td>
                          <div style={styles.nomClassement}>
                            <TeamAvatar equipe={ligne.equipe} taille={38} />
                            <strong>{ligne.equipe.nom}</strong>
                          </div>
                        </td>
                        <td>{ligne.mj}</td>
                        <td>{ligne.v}</td>
                        <td>{ligne.n}</td>
                        <td>{ligne.d}</td>
                        <td>{ligne.pour}</td>
                        <td>{ligne.contre}</td>
                        <td>
                          {ligne.diff > 0 ? "+" : ""}
                          {ligne.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {qrOuvert && (
          <div style={styles.modalFond} onClick={() => setQrOuvert(false)}>
            <section
              style={styles.qrModal}
              onClick={(event) => event.stopPropagation()}
            >
              <h2>Partager le tournoi</h2>
              <div style={styles.qrCode}>
                <QRCodeSVG value={lienPartage} size={220} />
              </div>
              <p style={styles.lienPartage}>{lienPartage}</p>
              <button style={styles.principal} onClick={copierLien}>
                Copier le lien
              </button>
              <button
                style={styles.fermerModal}
                onClick={() => setQrOuvert(false)}
              >
                Fermer
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 16px 60px",
    background: "linear-gradient(145deg,#07101f,#0f172a 45%,#111c33)",
    color: "#f8fafc",
    fontFamily: "Arial,sans-serif",
  },
  conteneur: { width: "100%", maxWidth: 1050, margin: "0 auto" },
  topActions: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 50,
    display: "flex",
    gap: 8,
  },
  retourDashboard: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  deconnexion: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#162033",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(0,0,0,.25)",
  },
  creation: {
    width: "100%",
    maxWidth: 700,
    margin: "30px auto",
    padding: 28,
    background: "rgba(30,41,59,.94)",
    border: "1px solid #334155",
    borderRadius: 24,
  },
  logo: { textAlign: "center", fontSize: 50 },
  surtitre: {
    color: "#60a5fa",
    fontWeight: 900,
    letterSpacing: 2,
    fontSize: 12,
  },
  titre: { textAlign: "center", fontSize: 36 },
  grandTitre: { margin: "4px 0", fontSize: "clamp(28px,5vw,42px)" },
  muted: { color: "#94a3b8" },
  label: { display: "block", margin: "22px 0 8px", fontWeight: 800 },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #64748b",
    fontSize: 16,
  },
  ligneTitre: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  ajouter: {
    border: 0,
    borderRadius: 11,
    padding: "11px 14px",
    background: "#172554",
    color: "#bfdbfe",
    fontWeight: 900,
    cursor: "pointer",
  },
  listeEquipes: { display: "grid", gap: 10, marginTop: 14 },
  vide: {
    padding: 24,
    border: "1px dashed #475569",
    borderRadius: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  messageCloud: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#0f172a",
    color: "#bfdbfe",
    textAlign: "center",
  },
  cloudBadge: {
    display: "inline-block",
    marginTop: 10,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#0f172a",
    color: "#86efac",
    fontSize: 13,
    fontWeight: 800,
  },
  principal: {
    width: "100%",
    marginTop: 24,
    padding: 15,
    border: 0,
    borderRadius: 12,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    fontSize: 17,
    cursor: "pointer",
  },
  entete: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  actionsTournoi: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  partager: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#172554",
    color: "#bfdbfe",
    fontWeight: 800,
    cursor: "pointer",
  },
  progressionCard: {
    padding: 18,
    marginBottom: 18,
    background: "rgba(30,41,59,.94)",
    border: "1px solid #334155",
    borderRadius: 18,
  },
  progressionEntete: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressionFond: {
    height: 12,
    marginBottom: 10,
    background: "#0f172a",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressionBarre: {
    height: "100%",
    background: "linear-gradient(90deg,#2563eb,#22c55e)",
    borderRadius: 999,
    transition: "width .3s ease",
  },
  statsGrille: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
    gap: 14,
    marginBottom: 18,
  },
  statCarte: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 20,
    borderRadius: 18,
    background: "rgba(30,41,59,.94)",
    border: "1px solid #334155",
  },
  statIcone: { fontSize: 30 },
  statLabel: { color: "#94a3b8", fontSize: 13 },
  statValeur: { fontSize: 20 },
  modalFond: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "grid",
    placeItems: "center",
    padding: 18,
    background: "rgba(2,6,23,.85)",
  },
  qrModal: {
    width: "100%",
    maxWidth: 390,
    padding: 24,
    textAlign: "center",
    borderRadius: 22,
    background: "#1e293b",
    border: "1px solid #475569",
  },
  qrCode: {
    display: "inline-block",
    padding: 16,
    background: "white",
    borderRadius: 16,
  },
  lienPartage: {
    overflowWrap: "anywhere",
    color: "#93c5fd",
    fontSize: 13,
  },
  fermerModal: {
    width: "100%",
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #475569",
    background: "transparent",
    color: "white",
    cursor: "pointer",
  },
  secondaire: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#162033",
    color: "white",
    cursor: "pointer",
  },
  nav: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    padding: 6,
    background: "#111b2e",
    borderRadius: 15,
    marginBottom: 18,
  },
  onglet: {
    border: 0,
    padding: 13,
    borderRadius: 11,
    background: "transparent",
    color: "#94a3b8",
    fontWeight: 900,
    cursor: "pointer",
  },
  actif: { background: "#263348", color: "white" },
  section: {
    padding: 22,
    marginBottom: 18,
    background: "rgba(30,41,59,.94)",
    border: "1px solid #334155",
    borderRadius: 20,
  },
  matchs: { display: "grid", gap: 10 },
  match: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 18px 60px 1fr",
    alignItems: "center",
    gap: 10,
    padding: 13,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 14,
  },
  equipeGauche: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 9,
    textAlign: "right",
  },
  equipeDroite: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },
  score: {
    width: "100%",
    minWidth: 0,
    padding: "10px 4px",
    borderRadius: 9,
    border: "1px solid #64748b",
    textAlign: "center",
    fontWeight: 900,
    fontSize: 17,
  },
  podium: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
    overflowX: "auto",
    marginTop: 26,
  },
  podiumColonne: {
    width: 180,
    minWidth: 135,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    textAlign: "center",
  },
  marche: {
    width: "100%",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px 15px 0 0",
    fontSize: 36,
    fontWeight: 900,
  },
  table: {
    width: "100%",
    minWidth: 700,
    borderCollapse: "collapse",
    textAlign: "center",
  },
  nomClassement: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
  },
};
