"use client";

import type { CSSProperties } from "react";
import TourneoNav from "@/components/TourneoNav";

const formats = [
  { title: "Championnat complet", text: "Chaque participant rencontre tous les autres. Le classement se fait aux points. Idéal si vous voulez une compétition complète et un classement précis." },
  { title: "Phase de poules", text: "Les participants sont répartis en groupes. Chaque poule possède son propre classement. Idéal quand il y a beaucoup de participants." },
  { title: "Élimination directe", text: "Le gagnant avance, le perdant est éliminé. Quarts, demi-finales puis finale. Idéal pour un tournoi rapide et spectaculaire." },
  { title: "Poules + phase finale", text: "Les meilleurs de chaque poule se qualifient ensuite pour une phase à élimination directe. C’est le format le plus proche des grands tournois." },
];

export default function AidePage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <TourneoNav active="aide" primaryLabel="Créer un tournoi" primaryHref="/tournoi/nouveau" />
        <section style={s.hero}>
          <div>
            <span style={s.eyebrow}>Aide & sécurité</span>
            <h1 style={s.title}>Tourneo doit être compréhensible sans mode d’emploi.</h1>
            <p style={s.muted}>Retrouvez ici les formats, le QR joueur, le partage public et les principales règles de fonctionnement.</p>
          </div>
        </section>

        <section style={s.section}>
          <span style={s.eyebrow}>Choisir le bon format</span>
          <div style={s.grid}>
            {formats.map((f, i) => (
              <article key={f.title} style={s.card}>
                <span style={s.number}>{String(i + 1).padStart(2, "0")}</span>
                <h2 style={s.cardTitle}>{f.title}</h2>
                <p style={s.muted}>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={s.grid}>
          <article style={s.card}>
            <span style={s.eyebrow}>Identifiant joueur</span>
            <h2 style={s.cardTitle}>À quoi sert le QR personnel ?</h2>
            <p style={s.muted}>Chaque profil possède un code et un QR Tourneo. L’organisateur peut ajouter un joueur sans ressaisir son nom, son avatar et sa couleur. Le créateur du tournoi peut aussi utiliser directement le bouton « M’ajouter ».</p>
          </article>
          <article style={s.card}>
            <span style={s.eyebrow}>Partage</span>
            <h2 style={s.cardTitle}>Le QR du tournoi est en lecture seule</h2>
            <p style={s.muted}>Les spectateurs peuvent suivre les matchs, scores et classements sans modifier les résultats. L’organisation reste réservée au compte créateur.</p>
          </article>
          <article style={s.card}>
            <span style={s.eyebrow}>Scores</span>
            <h2 style={s.cardTitle}>Valider puis corriger si nécessaire</h2>
            <p style={s.muted}>Un score reste modifiable tant qu’il n’est pas validé. Après validation, l’organisateur peut demander une correction. En élimination, corriger un ancien tour peut supprimer les tours suivants pour garantir la cohérence.</p>
          </article>
          <article style={s.card}>
            <span style={s.eyebrow}>Responsabilité</span>
            <h2 style={s.cardTitle}>Tourneo est un outil d’organisation</h2>
            <p style={s.muted}>Tourneo aide à gérer une compétition mais ne remplace pas le règlement de l’organisateur. L’organisateur reste responsable des règles, participants, scores saisis, décisions sportives et conditions de sécurité de son événement.</p>
          </article>
        </section>

        <section style={s.notice}>
          <strong>Conseil</strong>
          <span>Pour un tournoi important, définissez le règlement avant le début, vérifiez les participants et faites confirmer les résultats litigieux avant la clôture.</span>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "22px 18px 90px", background: "radial-gradient(circle at 15% 7%,rgba(124,92,255,.18),transparent 28%),linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1100, margin: "0 auto" },
  hero: { display: "block", marginBottom: 28, padding: 24, borderRadius: 28, border: "1px solid rgba(148,163,184,.14)", background: "rgba(15,25,43,.72)" },
  eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { margin: "7px 0", fontSize: "clamp(34px,6vw,64px)", lineHeight: 1.02 },
  muted: { color: "#8A9BB1", lineHeight: 1.6, overflowWrap: "anywhere" },
  section: { marginBottom: 18 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, marginTop: 12, marginBottom: 18 },
  card: { minWidth: 0, padding: 20, borderRadius: 22, background: "rgba(15,25,43,.78)", border: "1px solid rgba(148,163,184,.13)", overflow: "hidden" },
  number: { color: "#7C5CFF", fontWeight: 1000, fontSize: 24 },
  cardTitle: { margin: "8px 0", fontSize: 21 },
  notice: { display: "grid", gap: 5, padding: 18, borderRadius: 18, border: "1px solid rgba(114,231,255,.18)", background: "rgba(114,231,255,.05)", color: "#CDEFF8" },
};
