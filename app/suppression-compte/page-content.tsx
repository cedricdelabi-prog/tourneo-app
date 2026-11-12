"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import type { CSSProperties } from "react";
import Link from "next/link";
import TourneoRetour from "@/components/TourneoRetour";
export default function SuppressionComptePage() {
    useLangue();
    return (<main style={s.page}>
      <div style={s.shell}>
        <TourneoRetour href="/">{tr("Accueil Tourneo")}</TourneoRetour>

        <header style={s.hero}>
          <span style={s.eyebrow}>{tr("TOURNEO")}</span>

          <h1 style={s.title}>{tr("Suppression de compte")}</h1>

          <p style={s.subtitle}>{tr("Vous pouvez demander la suppression de votre compte Tourneo et des donn\u00E9es personnelles qui lui sont associ\u00E9es.")}</p>
        </header>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("Comment demander la suppression ?")}</h2>

          <p style={s.text}>{tr("Pour supprimer votre compte Tourneo, utilisez la page de contact officielle et indiquez clairement que vous souhaitez supprimer votre compte.")}</p>

          <p style={s.text}>{tr("Afin de retrouver le compte concern\u00E9, indiquez l\u2019adresse e-mail utilis\u00E9e lors de votre inscription \u00E0 Tourneo.")}</p>

          <Link href="/contact" style={s.button}>{tr("Faire une demande de suppression")}</Link>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("Donn\u00E9es concern\u00E9es")}</h2>

          <p style={s.text}>{tr("Apr\u00E8s v\u00E9rification de la demande, les donn\u00E9es personnelles li\u00E9es au compte peuvent notamment comprendre :")}</p>

          <ul style={s.list}>
            <li>{tr("l\u2019adresse e-mail du compte ;")}</li>
            <li>{tr("le pr\u00E9nom et le nom renseign\u00E9s ;")}</li>
            <li>{tr("le pseudonyme ou nom affich\u00E9 ;")}</li>
            <li>{tr("la ville renseign\u00E9e volontairement ;")}</li>
            <li>{tr("la photo ou le GIF de profil ;")}</li>
            <li>{tr("la couleur du profil ;")}</li>
            <li>{tr("l\u2019identifiant joueur Tourneo ;")}</li>
            <li>{tr("les informations personnelles associ\u00E9es au profil.")}</li>
          </ul>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("Donn\u00E9es li\u00E9es aux tournois")}</h2>

          <p style={s.text}>{tr("Certaines donn\u00E9es relatives \u00E0 des tournois, matchs, scores, r\u00E9sultats ou classements peuvent devoir \u00EAtre conserv\u00E9es sous une forme non directement associ\u00E9e au compte lorsque leur suppression compromettrait l\u2019int\u00E9grit\u00E9 d\u2019un tournoi auquel plusieurs participants ont pris part.")}</p>

          <p style={s.text}>{tr("Lorsque cela est possible, les informations permettant d\u2019identifier directement l\u2019utilisateur seront supprim\u00E9es ou dissoci\u00E9es de ces donn\u00E9es.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("D\u00E9lai et v\u00E9rification")}</h2>

          <p style={s.text}>{tr("Une v\u00E9rification de l\u2019identit\u00E9 du demandeur peut \u00EAtre effectu\u00E9e afin d\u2019\u00E9viter la suppression frauduleuse du compte d\u2019une autre personne.")}</p>

          <p style={s.text}>{tr("Une fois la demande valid\u00E9e, Tourneo proc\u00E9dera \u00E0 sa prise en charge dans les meilleurs d\u00E9lais, sous r\u00E9serve des \u00E9ventuelles obligations l\u00E9gales de conservation applicables.")}</p>
        </section>

        <section style={s.card}>
          <h2 style={s.heading}>{tr("Politique de confidentialit\u00E9")}</h2>

          <p style={s.text}>{tr("Pour plus d\u2019informations sur l\u2019utilisation et la protection de vos donn\u00E9es :")}</p>

          <Link href="/confidentialite" style={s.secondaryButton}>{tr("Consulter la politique de confidentialit\u00E9")}</Link>
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
        background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",
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
