"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import type { CSSProperties } from "react";
import Link from "next/link";
import TourneoRetour from "@/components/TourneoRetour";
export default function ConfidentialitePage() {
    useLangue();
    return (<main style={s.page}>
      <div style={s.shell}>
        <TourneoRetour href="/">{tr("Accueil Tourneo")}</TourneoRetour>

        <header style={s.hero}>
          <span style={s.eyebrow}>{tr("Tourneo")}</span>
          <h1 style={s.title}>{tr("Politique de confidentialit\u00E9")}</h1>
          <p style={s.subtitle}>{tr("Dernière mise à jour : 13 novembre 2026")}</p>
        </header>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("1. Pr\u00E9sentation")}</h2>
          <p style={s.text}>{tr("La pr\u00E9sente politique de confidentialit\u00E9 explique comment Tourneo collecte, utilise, conserve et prot\u00E8ge les donn\u00E9es personnelles n\u00E9cessaires au fonctionnement de l\u2019application et du site Tourneo.")}</p>

          <p style={s.text}>{tr("Tourneo permet notamment de cr\u00E9er et g\u00E9rer des tournois, g\u00E9rer des participants, enregistrer des r\u00E9sultats, consulter des classements et utiliser un profil joueur.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("2. Donn\u00E9es pouvant \u00EAtre trait\u00E9es")}</h2>

          <p style={s.text}>{tr("Selon les fonctionnalit\u00E9s utilis\u00E9es, Tourneo peut traiter les cat\u00E9gories de donn\u00E9es suivantes :")}</p>

          <ul style={s.list}>
            <li>{tr("adresse e-mail ;")}</li>
            <li>{tr("pr\u00E9nom et nom ;")}</li>
            <li>{tr("nom affich\u00E9 ou pseudonyme ;")}</li>
            <li>{tr("ville renseign\u00E9e volontairement ;")}</li>
            <li>{tr("photo de profil ou GIF ajout\u00E9 volontairement ;")}</li>
            <li>{tr("couleur de profil ;")}</li>
            <li>{tr("identifiant joueur Tourneo et QR code associ\u00E9 ;")}</li>
            <li>{tr("donn\u00E9es relatives aux tournois cr\u00E9\u00E9s ou rejoints ;")}</li>
            <li>{tr("noms des joueurs ou \u00E9quipes ;")}</li>
            <li>{tr("scores, r\u00E9sultats, classements et statistiques ;")}</li>
            <li>{tr("informations techniques n\u00E9cessaires au fonctionnement et \u00E0 la s\u00E9curit\u00E9 du service.")}</li>
          </ul>

          <p style={s.text}>{tr("Tourneo ne demande pas aux utilisateurs de transmettre des donn\u00E9es sensibles telles que des donn\u00E9es m\u00E9dicales, bancaires ou des informations relatives aux opinions politiques ou religieuses.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("3. Cr\u00E9ation et gestion d\u2019un compte")}</h2>

          <p style={s.text}>{tr("La cr\u00E9ation d\u2019un compte Tourneo repose actuellement sur une adresse e-mail et un mot de passe. Lors de l\u2019inscription, l\u2019utilisateur peut \u00E9galement fournir un pr\u00E9nom, un nom, un pseudonyme et une ville.")}</p>

          <p style={s.text}>{tr("Les informations d\u2019authentification sont g\u00E9r\u00E9es \u00E0 l\u2019aide du service Supabase Authentication.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("4. Profil joueur")}</h2>

          <p style={s.text}>{tr("L\u2019utilisateur peut personnaliser son profil avec un nom affich\u00E9, une photo ou un GIF, une couleur ainsi que certaines informations facultatives.")}</p>

          <p style={s.text}>{tr("Tourneo g\u00E9n\u00E8re \u00E9galement un identifiant joueur unique et un QR code permettant notamment \u00E0 un organisateur de retrouver plus facilement un joueur dans le cadre d\u2019un tournoi.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("5. Donn\u00E9es li\u00E9es aux tournois")}</h2>

          <p style={s.text}>{tr("Les organisateurs peuvent cr\u00E9er des tournois et enregistrer des informations telles que le nom du tournoi, les participants, les \u00E9quipes, les matchs, les scores, les r\u00E9sultats et les classements.")}</p>

          <p style={s.text}>{tr("Certaines informations li\u00E9es \u00E0 un tournoi peuvent \u00EAtre accessibles via une page publique de partage lorsque l\u2019organisateur utilise la fonctionnalit\u00E9 de partage ou de QR code pr\u00E9vue par Tourneo.")}</p>
        </section>

        <section style={s.card} id="photos">
          <h2 style={s.heading}>{tr('5 bis. Photos du tournoi et accès')}</h2>
          <p style={s.text}>{tr('Les photos ajoutées au tournoi sont réservées par défaut à son organisateur. Les originaux ne sont pas publiés sur la page des joueurs.')}</p>
          <p style={s.text}>{tr('L’organisateur peut activer le partage des versions avec bandeau : toute personne disposant du lien du tournoi pourra alors les consulter et les télécharger. Le bandeau peut afficher le logo Tourneo, le logo de l’organisateur, le nom du tournoi et sa date.')}</p>
          <p style={s.text}>{tr('Le rôle administrateur ou super administrateur dans l’application ne donne pas accès aux albums privés des autres organisateurs. L’écran d’administration ne propose pas de consultation globale de ces photos. Les prestataires techniques hébergent les fichiers selon les conditions décrites ci-dessous.')}</p>
          <p style={s.text}>{tr('L’organisateur peut retirer le partage ou supprimer une photo depuis son album. Ce retrait bloque les nouvelles récupérations dans Tourneo, mais ne supprime pas les copies déjà enregistrées par des tiers.')}</p>
          <p style={s.text}>{tr('Après la fin du tournoi, l’accès aux photos expire au bout de 15 jours en mode Simple et de 90 jours en mode Expert. Le nettoyage automatique supprime ensuite les fichiers concernés. En l’absence de fin de tournoi, ce délai ne commence pas encore.')}</p>
          <p style={s.text}>{tr('Avant de publier des photos de personnes reconnaissables, l’organisateur doit les informer de l’usage prévu et recueillir les autorisations nécessaires, notamment pour les mineurs. La possibilité technique de partager ne vaut pas autorisation de diffuser ou de vendre une image.')}</p>
          <p style={s.text}>{tr('Pour demander le retrait d’une photo, contactez l’organisateur du tournoi ou Tourneo depuis la page Contact en indiquant le tournoi et la photo concernés.')}</p>
          <Link href="/contact" style={s.button}>{tr('Demander le retrait d’une photo')}</Link>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("6. Finalit\u00E9s du traitement")}</h2>

          <p style={s.text}>{tr("Les donn\u00E9es sont utilis\u00E9es uniquement pour permettre le fonctionnement et l\u2019am\u00E9lioration de Tourneo, notamment pour :")}</p>

          <ul style={s.list}>
            <li>{tr("cr\u00E9er et s\u00E9curiser les comptes utilisateurs ;")}</li>
            <li>{tr("authentifier les utilisateurs ;")}</li>
            <li>{tr("enregistrer les profils joueurs ;")}</li>
            <li>{tr("cr\u00E9er et g\u00E9rer des tournois ;")}</li>
            <li>{tr("enregistrer les participants et les r\u00E9sultats ;")}</li>
            <li>{tr("calculer les classements et statistiques ;")}</li>
            <li>{tr("permettre le partage de certains tournois ;")}</li>
            <li>{tr("assurer la s\u00E9curit\u00E9 et la stabilit\u00E9 technique du service ;")}</li>
            <li>{tr("r\u00E9pondre aux demandes envoy\u00E9es au support Tourneo.")}</li>
          </ul>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("7. H\u00E9bergement et prestataires")}</h2>

          <p style={s.text}>{tr("Tourneo utilise des prestataires techniques n\u00E9cessaires au fonctionnement de l\u2019application.")}</p>

          <p style={s.text}>
            <strong>{tr("Supabase")}</strong>{tr(" est utilis\u00E9 notamment pour l\u2019authentification, la base de donn\u00E9es et le stockage de certains fichiers comme les photos de profil.")}</p>

          <p style={s.text}>
            <strong>{tr("Vercel")}</strong>{tr(" est utilis\u00E9 pour l\u2019h\u00E9bergement et le d\u00E9ploiement de l\u2019application web Tourneo.")}</p>

          <p style={s.text}>{tr("Ces prestataires peuvent traiter certaines donn\u00E9es techniques dans le cadre de la fourniture de leurs services et selon leurs propres politiques de confidentialit\u00E9.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("8. Publicit\u00E9")}</h2>

          <p style={s.text}>{tr("La version V2 de Tourneo ne diffuse pas de publicit\u00E9 et ne charge aucun service Google AdSense ou AdMob.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("9. Conservation des donn\u00E9es")}</h2>

          <p style={s.text}>{tr("Les donn\u00E9es sont conserv\u00E9es pendant la dur\u00E9e n\u00E9cessaire au fonctionnement du compte et des services Tourneo.")}</p>

          <p style={s.text}>{tr("Certaines donn\u00E9es peuvent \u00E9galement \u00EAtre conserv\u00E9es pendant une dur\u00E9e suppl\u00E9mentaire lorsque cela est n\u00E9cessaire pour des raisons de s\u00E9curit\u00E9, de pr\u00E9vention des abus ou pour respecter une obligation l\u00E9gale.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("10. Suppression du compte et des donn\u00E9es")}</h2>

          <p style={s.text}>{tr("Un utilisateur peut demander la suppression de son compte Tourneo ainsi que des donn\u00E9es personnelles associ\u00E9es.")}</p>

          <p style={s.text}>{tr("La demande peut \u00EAtre effectu\u00E9e via la page Contact de Tourneo en pr\u00E9cisant l\u2019adresse e-mail associ\u00E9e au compte et en indiquant qu\u2019il s\u2019agit d\u2019une demande de suppression de compte.")}</p>

          <Link href="/contact" style={s.button}>{tr("Acc\u00E9der \u00E0 la page Contact")}</Link>

          <p style={s.note}>{tr("Une v\u00E9rification de l\u2019identit\u00E9 du demandeur peut \u00EAtre n\u00E9cessaire avant la suppression d\u00E9finitive des donn\u00E9es afin d\u2019\u00E9viter la suppression frauduleuse d\u2019un compte appartenant \u00E0 une autre personne.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("11. S\u00E9curit\u00E9")}</h2>

          <p style={s.text}>{tr("Tourneo met en \u0153uvre des mesures techniques raisonnables destin\u00E9es \u00E0 prot\u00E9ger les comptes et les donn\u00E9es contre les acc\u00E8s non autoris\u00E9s, les modifications ou les suppressions accidentelles.")}</p>

          <p style={s.text}>{tr("Les utilisateurs doivent \u00E9galement conserver leur mot de passe confidentiel et \u00E9viter de le communiquer \u00E0 un tiers.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("12. Mineurs")}</h2>

          <p style={s.text}>{tr("Tourneo est un outil d\u2019organisation de tournois sportifs et de loisirs. Lorsqu\u2019un mineur utilise Tourneo, son utilisation doit \u00EAtre r\u00E9alis\u00E9e conform\u00E9ment aux r\u00E8gles applicables et, lorsque cela est n\u00E9cessaire, sous la responsabilit\u00E9 ou avec l\u2019autorisation de son repr\u00E9sentant l\u00E9gal.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("13. Droits des utilisateurs")}</h2>

          <p style={s.text}>{tr("Selon la r\u00E9glementation applicable, l\u2019utilisateur peut notamment demander l\u2019acc\u00E8s, la rectification ou la suppression de ses donn\u00E9es personnelles.")}</p>

          <p style={s.text}>{tr("Les demandes peuvent \u00EAtre transmises depuis la page Contact de Tourneo.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("14. Modification de cette politique")}</h2>

          <p style={s.text}>{tr("Cette politique peut \u00EAtre mise \u00E0 jour afin de tenir compte de l\u2019\u00E9volution de Tourneo, de ses fonctionnalit\u00E9s ou des obligations r\u00E9glementaires.")}</p>

          <p style={s.text}>{tr("La date de derni\u00E8re mise \u00E0 jour indiqu\u00E9e en haut de cette page sera modifi\u00E9e lorsqu\u2019une nouvelle version sera publi\u00E9e.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("15. Contact")}</h2>

          <p style={s.text}>{tr("Pour toute question relative \u00E0 la confidentialit\u00E9 ou aux donn\u00E9es personnelles, vous pouvez utiliser la page de contact officielle de Tourneo.")}</p>

          <Link href="/contact" style={s.button}>{tr("Contacter Tourneo")}</Link>
        </section>

        <footer style={s.footer}>{tr("\u00A9 2026 Tourneo \u2014 Tous droits r\u00E9serv\u00E9s.")}</footer>
      </div>
    </main>);
}
const s: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px 18px 70px",
        background: "radial-gradient(circle at 15% 5%,rgba(124,92,255,.18),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",
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
        background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",
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
