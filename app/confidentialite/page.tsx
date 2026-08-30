import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité | Tourneo",
  description:
    "Politique de confidentialité de Tourneo : données collectées, utilisation, conservation et droits des utilisateurs.",
};

export default function ConfidentialitePage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <Link href="/" style={s.back}>
          ← Retour à Tourneo
        </Link>

        <header style={s.hero}>
          <span style={s.eyebrow}>Tourneo</span>
          <h1 style={s.title}>Politique de confidentialité</h1>
          <p style={s.subtitle}>
            Dernière mise à jour : 30 août 2026
          </p>
        </header>

        <section style={s.card}>
          <h2 style={s.heading}>1. Présentation</h2>
          <p style={s.text}>
            La présente politique de confidentialité explique comment Tourneo
            collecte, utilise, conserve et protège les données personnelles
            nécessaires au fonctionnement de l’application et du site Tourneo.
          </p>

          <p style={s.text}>
            Tourneo permet notamment de créer et gérer des tournois, gérer des
            participants, enregistrer des résultats, consulter des classements
            et utiliser un profil joueur.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>2. Données pouvant être traitées</h2>

          <p style={s.text}>
            Selon les fonctionnalités utilisées, Tourneo peut traiter les
            catégories de données suivantes :
          </p>

          <ul style={s.list}>
            <li>adresse e-mail ;</li>
            <li>prénom et nom ;</li>
            <li>nom affiché ou pseudonyme ;</li>
            <li>ville renseignée volontairement ;</li>
            <li>photo de profil ou GIF ajouté volontairement ;</li>
            <li>couleur de profil ;</li>
            <li>identifiant joueur Tourneo et QR code associé ;</li>
            <li>données relatives aux tournois créés ou rejoints ;</li>
            <li>noms des joueurs ou équipes ;</li>
            <li>scores, résultats, classements et statistiques ;</li>
            <li>
              informations techniques nécessaires au fonctionnement et à la
              sécurité du service.
            </li>
          </ul>

          <p style={s.text}>
            Tourneo ne demande pas aux utilisateurs de transmettre des données
            sensibles telles que des données médicales, bancaires ou des
            informations relatives aux opinions politiques ou religieuses.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>3. Création et gestion d’un compte</h2>

          <p style={s.text}>
            La création d’un compte Tourneo repose actuellement sur une adresse
            e-mail et un mot de passe. Lors de l’inscription, l’utilisateur peut
            également fournir un prénom, un nom, un pseudonyme et une ville.
          </p>

          <p style={s.text}>
            Les informations d’authentification sont gérées à l’aide du service
            Supabase Authentication.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>4. Profil joueur</h2>

          <p style={s.text}>
            L’utilisateur peut personnaliser son profil avec un nom affiché,
            une photo ou un GIF, une couleur ainsi que certaines informations
            facultatives.
          </p>

          <p style={s.text}>
            Tourneo génère également un identifiant joueur unique et un QR code
            permettant notamment à un organisateur de retrouver plus facilement
            un joueur dans le cadre d’un tournoi.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>5. Données liées aux tournois</h2>

          <p style={s.text}>
            Les organisateurs peuvent créer des tournois et enregistrer des
            informations telles que le nom du tournoi, les participants, les
            équipes, les matchs, les scores, les résultats et les classements.
          </p>

          <p style={s.text}>
            Certaines informations liées à un tournoi peuvent être accessibles
            via une page publique de partage lorsque l’organisateur utilise la
            fonctionnalité de partage ou de QR code prévue par Tourneo.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>6. Finalités du traitement</h2>

          <p style={s.text}>
            Les données sont utilisées uniquement pour permettre le
            fonctionnement et l’amélioration de Tourneo, notamment pour :
          </p>

          <ul style={s.list}>
            <li>créer et sécuriser les comptes utilisateurs ;</li>
            <li>authentifier les utilisateurs ;</li>
            <li>enregistrer les profils joueurs ;</li>
            <li>créer et gérer des tournois ;</li>
            <li>enregistrer les participants et les résultats ;</li>
            <li>calculer les classements et statistiques ;</li>
            <li>permettre le partage de certains tournois ;</li>
            <li>assurer la sécurité et la stabilité technique du service ;</li>
            <li>répondre aux demandes envoyées au support Tourneo.</li>
          </ul>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>7. Hébergement et prestataires</h2>

          <p style={s.text}>
            Tourneo utilise des prestataires techniques nécessaires au
            fonctionnement de l’application.
          </p>

          <p style={s.text}>
            <strong>Supabase</strong> est utilisé notamment pour
            l’authentification, la base de données et le stockage de certains
            fichiers comme les photos de profil.
          </p>

          <p style={s.text}>
            <strong>Vercel</strong> est utilisé pour l’hébergement et le
            déploiement de l’application web Tourneo.
          </p>

          <p style={s.text}>
            Ces prestataires peuvent traiter certaines données techniques dans
            le cadre de la fourniture de leurs services et selon leurs propres
            politiques de confidentialité.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>8. Publicité</h2>

          <p style={s.text}>
            Tourneo peut afficher des espaces publicitaires afin de contribuer
            au financement du service.
          </p>

          <p style={s.text}>
            Sur la version web, Tourneo peut utiliser Google AdSense. Sur les
            versions mobiles, Tourneo pourra également utiliser des services
            publicitaires Google adaptés aux applications mobiles, notamment
            Google AdMob.
          </p>

          <p style={s.text}>
            Ces services peuvent utiliser des identifiants techniques, cookies
            ou technologies similaires conformément aux règles applicables et
            aux choix de consentement proposés aux utilisateurs lorsque cela est
            nécessaire.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>9. Conservation des données</h2>

          <p style={s.text}>
            Les données sont conservées pendant la durée nécessaire au
            fonctionnement du compte et des services Tourneo.
          </p>

          <p style={s.text}>
            Certaines données peuvent également être conservées pendant une
            durée supplémentaire lorsque cela est nécessaire pour des raisons
            de sécurité, de prévention des abus ou pour respecter une obligation
            légale.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>10. Suppression du compte et des données</h2>

          <p style={s.text}>
            Un utilisateur peut demander la suppression de son compte Tourneo
            ainsi que des données personnelles associées.
          </p>

          <p style={s.text}>
            La demande peut être effectuée via la page Contact de Tourneo en
            précisant l’adresse e-mail associée au compte et en indiquant qu’il
            s’agit d’une demande de suppression de compte.
          </p>

          <Link href="/contact" style={s.button}>
            Accéder à la page Contact
          </Link>

          <p style={s.note}>
            Une vérification de l’identité du demandeur peut être nécessaire
            avant la suppression définitive des données afin d’éviter la
            suppression frauduleuse d’un compte appartenant à une autre
            personne.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>11. Sécurité</h2>

          <p style={s.text}>
            Tourneo met en œuvre des mesures techniques raisonnables destinées à
            protéger les comptes et les données contre les accès non autorisés,
            les modifications ou les suppressions accidentelles.
          </p>

          <p style={s.text}>
            Les utilisateurs doivent également conserver leur mot de passe
            confidentiel et éviter de le communiquer à un tiers.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>12. Mineurs</h2>

          <p style={s.text}>
            Tourneo est un outil d’organisation de tournois sportifs et de
            loisirs. Lorsqu’un mineur utilise Tourneo, son utilisation doit être
            réalisée conformément aux règles applicables et, lorsque cela est
            nécessaire, sous la responsabilité ou avec l’autorisation de son
            représentant légal.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>13. Droits des utilisateurs</h2>

          <p style={s.text}>
            Selon la réglementation applicable, l’utilisateur peut notamment
            demander l’accès, la rectification ou la suppression de ses données
            personnelles.
          </p>

          <p style={s.text}>
            Les demandes peuvent être transmises depuis la page Contact de
            Tourneo.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>14. Modification de cette politique</h2>

          <p style={s.text}>
            Cette politique peut être mise à jour afin de tenir compte de
            l’évolution de Tourneo, de ses fonctionnalités ou des obligations
            réglementaires.
          </p>

          <p style={s.text}>
            La date de dernière mise à jour indiquée en haut de cette page sera
            modifiée lorsqu’une nouvelle version sera publiée.
          </p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>15. Contact</h2>

          <p style={s.text}>
            Pour toute question relative à la confidentialité ou aux données
            personnelles, vous pouvez utiliser la page de contact officielle de
            Tourneo.
          </p>

          <Link href="/contact" style={s.button}>
            Contacter Tourneo
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
    textTransform: "uppercase",
  },

  title: {
    margin: "8px 0",
    fontSize: "clamp(36px,7vw,64px)",
    lineHeight: 1.02,
  },

  subtitle: {
    color: "#8799B0",
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

  note: {
    color: "#8799B0",
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 18,
  },

  button: {
    display: "inline-block",
    marginTop: 6,
    padding: "12px 16px",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
  },

  footer: {
    marginTop: 30,
    textAlign: "center",
    color: "#65758C",
    fontSize: 13,
  },
};