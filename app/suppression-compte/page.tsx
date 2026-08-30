import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Suppression de compte | Tourneo",
  description:
    "Demander la suppression d'un compte Tourneo et des données personnelles associées.",
};

export default function SuppressionComptePage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <Link href="/" style={s.back}>
          ← Retour à Tourneo
        </Link>

        <header style={s.hero}>
          <span style={s.eyebrow}>TOURNEO</span>

          <h1 style={s.title}>Suppression de compte</h1>

          <p style={s.subtitle}>
            Vous pouvez demander la suppression de votre compte Tourneo et des
            données personnelles qui lui sont associées.
          </p>
        </header>

        <section style={s.card}>
          <h2 style={s.heading}>Comment demander la suppression ?</h2>

          <p style={s.text}>
            Pour supprimer votre compte Tourneo, utilisez la page de contact
            officielle et indiquez clairement que vous souhaitez supprimer
            votre compte.
          </p>

          <p style={s.text}>
            Afin de retrouver le compte concerné, indiquez l’adresse e-mail
            utilisée lors de votre inscription à Tourneo.
          </p>

          <Link href="/contact" style={s.button}>
            Faire une demande de suppression
          </Link>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>Données concernées</h2>

          <p style={s.text}>
            Après vérification de la demande, les données personnelles liées au
            compte peuvent notamment comprendre :
          </p>

          <ul style={s.list}>
            <li>l’adresse e-mail du compte ;</li>
            <li>le prénom et le nom renseignés ;</li>
            <li>le pseudonyme ou nom affiché ;</li>
            <li>la ville renseignée volontairement ;</li>
            <li>la photo ou le GIF de profil ;</li>
            <li>la couleur du profil ;</li>
            <li>l’identifiant joueur Tourneo ;</li>
            <li>les informations personnelles associées au profil.</li>
          </ul>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>Données liées aux tournois</h2>

          <p style={s.text}>
            Certaines données relatives à des tournois, matchs, scores,
            résultats ou classements peuvent devoir être conservées sous une
            forme non directement associée au compte lorsque leur suppression
            compromettrait l’intégrité d’un tournoi auquel plusieurs
            participants ont pris part.
          </p>

          <p style={s.text}>
            Lorsque cela est possible, les informations permettant d’identifier
            directement l’utilisateur seront supprimées ou dissociées de ces
            données.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>Délai et vérification</h2>

          <p style={s.text}>
            Une vérification de l’identité du demandeur peut être effectuée afin
            d’éviter la suppression frauduleuse du compte d’une autre personne.
          </p>

          <p style={s.text}>
            Une fois la demande validée, Tourneo procédera à sa prise en charge
            dans les meilleurs délais, sous réserve des éventuelles obligations
            légales de conservation applicables.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>Politique de confidentialité</h2>

          <p style={s.text}>
            Pour plus d’informations sur l’utilisation et la protection de vos
            données :
          </p>

          <Link href="/confidentialite" style={s.secondaryButton}>
            Consulter la politique de confidentialité
          </Link>
        </section>

        <footer style={s.footer}>
          © 2026 Tourneo — Tous droits réservés.
        </footer>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 18px 70px",
    background:
      "radial-gradient(circle at 15% 5%,rgba(124,92,255,.18),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",
    color: "white",
    fontFamily: "Inter,system-ui,sans-serif",
  },

  shell: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
  },

  back: {
    display: "inline-block",
    marginBottom: 24,
    color: "#72E7FF",
    fontWeight: 800,
    textDecoration: "none",
  },

  hero: {
    marginBottom: 22,
  },

  eyebrow: {
    color: "#72E7FF",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  title: {
    margin: "8px 0",
    fontSize: "clamp(36px,7vw,64px)",
    lineHeight: 1.02,
  },

  subtitle: {
    color: "#8799B0",
    lineHeight: 1.6,
    maxWidth: 700,
  },

  card: {
    padding: 24,
    borderRadius: 24,
    background: "rgba(15,25,43,.78)",
    border: "1px solid rgba(148,163,184,.14)",
    marginBottom: 14,
  },

  heading: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 21,
  },

  text: {
    color: "#B7C2D2",
    lineHeight: 1.7,
  },

  list: {
    color: "#B7C2D2",
    lineHeight: 1.8,
    paddingLeft: 22,
  },

  button: {
    display: "inline-block",
    marginTop: 8,
    padding: "13px 17px",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
  },

  secondaryButton: {
    display: "inline-block",
    marginTop: 8,
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(114,231,255,.35)",
    color: "#72E7FF",
    textDecoration: "none",
    fontWeight: 800,
  },

  footer: {
    marginTop: 30,
    textAlign: "center",
    color: "#65758C",
    fontSize: 13,
  },
};