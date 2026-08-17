"use client";

import type { CSSProperties } from "react";

export default function Aide() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <span style={s.eyebrow}>Tourneo</span>
            <h1 style={s.title}>Aide, sécurité & fonctionnement</h1>
            <p style={s.muted}>Tout ce qu’il faut savoir pour organiser un tournoi proprement.</p>
          </div>
          <div style={s.actions}>
            <button style={s.button} onClick={() => (window.location.href = "/contact")}>Nous contacter</button>
            <button style={s.button} onClick={() => history.back()}>Retour</button>
          </div>
        </header>

        <section style={s.cardWide}>
          <span style={s.eyebrow}>Choisir le bon format</span>
          <h2>Les 4 formats de tournoi</h2>
          <div style={s.formats}>
            <article style={s.formatCard}>
              <strong>Championnat complet</strong>
              <p>Chaque participant rencontre tous les autres. Idéal pour un petit groupe quand on veut un classement final très juste.</p>
            </article>
            <article style={s.formatCard}>
              <strong>Phase de poules</strong>
              <p>Les participants sont répartis en groupes. Chacun joue contre les membres de sa poule. Pratique quand il y a beaucoup de monde.</p>
            </article>
            <article style={s.formatCard}>
              <strong>Élimination directe</strong>
              <p>Une défaite élimine le participant. Les vainqueurs avancent jusqu’à la finale. Format rapide et très lisible.</p>
            </article>
            <article style={s.formatCard}>
              <strong>Poules puis phase finale</strong>
              <p>On commence par des poules, puis les meilleurs se qualifient pour une phase à élimination directe. C’est le format le plus complet.</p>
            </article>
          </div>
        </section>

        <section style={s.grid}>
          <article style={s.card}>
            <h2>Comment ça marche ?</h2>
            <p>1. Créez le tournoi et choisissez son format.</p>
            <p>2. Ajoutez les participants manuellement ou avec leur code Tourneo.</p>
            <p>3. Saisissez les résultats au fil des rencontres.</p>
            <p>4. Partagez le QR du tournoi : les visiteurs suivent le live en lecture seule.</p>
          </article>

          <article style={s.card}>
            <h2>Profils joueurs</h2>
            <p>Un joueur peut enregistrer son pseudo, sa photo ou son GIF et sa couleur préférée. Quand son code Tourneo est utilisé dans un tournoi, son identité visuelle est automatiquement reprise.</p>
          </article>

          <article style={s.card}>
            <h2>Intégrité des résultats</h2>
            <p>L’organisateur reste responsable du règlement, de l’arbitrage et de la validation des scores. Tourneo facilite l’organisation mais ne remplace pas une décision officielle de l’organisateur.</p>
            <p>En cas de litige ou d’écart lié à un incident technique, la décision humaine et les justificatifs conservés par l’organisateur prévalent.</p>
          </article>

          <article style={s.card}>
            <h2>Sécurité</h2>
            <p>Ne partagez jamais votre mot de passe. La page publique d’un tournoi est conçue pour être en lecture seule. Les données de contact d’un joueur ne sont pas affichées sur son profil public.</p>
            <p>Évitez de saisir des données sensibles dans un nom d’équipe, de tournoi ou de joueur.</p>
          </article>

          <article style={s.card}>
            <h2>Données & confidentialité</h2>
            <p>Tourneo limite les données utiles au fonctionnement : compte, pseudo, identifiant joueur, avatar, couleur, tournois et résultats. Le palmarès sert à suivre la progression du joueur.</p>
          </article>

          <article style={s.card}>
            <h2>Suivre un tournoi</h2>
            <p>Le QR public permet de suivre les matchs et les scores sans pouvoir les modifier. Un joueur identifié peut aussi activer des alertes locales pour être prévenu lorsque son prochain match apparaît.</p>
          </article>

          <article style={s.card}>
            <h2>Publicité</h2>
            <p>Tourneo peut afficher des annonces automatiques afin de maintenir une version gratuite. Les emplacements publicitaires sont intégrés au design pour ne pas gêner la saisie des scores ni la lecture d’un tournoi.</p>
          </article>

          <article style={s.card}>
            <h2>Responsive</h2>
            <p>Tourneo est pensé pour ordinateur, tablette et téléphone. Les pages utilisent des grilles adaptatives et de gros contrôles tactiles.</p>
          </article>

          <article style={s.card}>
            <h2>Une idée, un bug ou une publicité ?</h2>
            <p>Utilisez la rubrique Contact pour signaler un problème, proposer une amélioration, parler publicité ou partenariat, ou poser une question.</p>
            <button style={s.primary} onClick={() => (window.location.href = "/contact")}>Ouvrir Contactez-nous</button>
          </article>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "28px 18px", background: "radial-gradient(circle at 18% 8%,rgba(124,92,255,.16),transparent 27%),linear-gradient(145deg,#070a12,#0b1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 20 },
  title: { fontSize: "clamp(34px,5vw,58px)", margin: "8px 0" },
  eyebrow: { color: "#72e7ff", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.3 },
  muted: { color: "#8195ae" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  button: { padding: "11px 14px", borderRadius: 13, border: "1px solid rgba(148,163,184,.14)", background: "rgba(255,255,255,.03)", color: "white", cursor: "pointer" },
  primary: { marginTop: 8, padding: "11px 14px", borderRadius: 13, border: 0, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)", color: "white", fontWeight: 900, cursor: "pointer" },
  cardWide: { padding: 24, marginBottom: 16, borderRadius: 26, background: "linear-gradient(135deg,rgba(124,92,255,.11),rgba(59,130,246,.05))", border: "1px solid rgba(148,163,184,.12)" },
  formats: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 },
  formatCard: { padding: 18, borderRadius: 18, background: "rgba(255,255,255,.035)", border: "1px solid rgba(148,163,184,.10)", color: "#aebed1", lineHeight: 1.55 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 },
  card: { padding: 22, borderRadius: 22, background: "rgba(15,25,43,.78)", border: "1px solid rgba(148,163,184,.12)", color: "#aebed1", lineHeight: 1.6 },
};
