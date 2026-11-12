"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import type { CSSProperties } from "react";
import Link from "next/link";
const guides = [
    ["/guides/outils-et-olympiades", "🎲", "Outils arbitre et Olympiades", "Chrono, points, tirage des équipes et journée avec plusieurs activités."],
    ["/guides/organiser-tournoi", "🏆", "Organiser un tournoi de A à Z", "Les étapes essentielles, de la préparation jusqu'au classement final."],
    ["/guides/nombre-matchs", "🧮", "Calculer le nombre de matchs", "Estimer rapidement le nombre de rencontres selon le format."],
    ["/guides/duree-tournoi", "⏱️", "Estimer la durée", "Construire un planning réaliste avec les terrains et les rotations."],
    ["/guides/egalites-classement", "⚖️", "Gérer les égalités", "Prévoir des règles de départage simples avant le premier match."],
    ["/guides/tournoi-foot", "⚽", "Tournoi de football", "Format, terrains, rotations, scores et classement."],
    ["/guides/tournoi-petanque", "🎯", "Tournoi de pétanque", "Équipes, terrains et enchaînement des parties."],
    ["/guides/tournoi-flechettes", "🎯", "Tournoi de fléchettes", "Formule, cibles, rotations et résultats."],
    ["/guides/tournoi-tennis-table", "🏓", "Tournoi de tennis de table", "Répartir les tables et limiter l'attente."],
    ["/guides/tournoi-gaming", "🎮", "Tournoi gaming / EA FC", "Postes, paramètres, format et rotation des joueurs."]
];
export default function GuidesPage() {
    useLangue();
    return <main style={s.page}><div style={s.shell}>
    <style>{`@media(max-width:700px){.gh{flex-direction:column!important;align-items:flex-start!important}.gn{width:100%!important}.gg{grid-template-columns:1fr!important}}@media(max-width:420px){.gn{display:grid!important;grid-template-columns:1fr 1fr!important}.gn a:last-child{grid-column:1/-1;text-align:center!important}}`}</style>
    <header className="gh" style={s.header}><Link href="/" style={s.brand}>{tr("TOURNEO")}</Link><nav className="gn" style={s.nav}><Link href="/formats-tournoi" style={s.navLink}>{tr("Formats")}</Link><Link href="/aide" style={s.navLink}>{tr("Aide")}</Link><Link href="/login" style={s.login}>{tr("Cr\u00E9er un tournoi")}</Link></nav></header>
    <section style={s.hero}><span style={s.eyebrow}>{tr("Guides pratiques")}</span><h1 style={s.title}>{tr("Un coup de main pour pr\u00E9parer votre tournoi.")}</h1><p style={s.lead}>{tr("Choisissez simplement le sujet qui vous int\u00E9resse. Les explications d\u00E9taill\u00E9es restent ici : l'accueil de Tourneo reste consacr\u00E9 \u00E0 l'application.")}</p></section>
    <section className="gg" style={s.grid}>{guides.map(([href, icon, title, text]) => <Link href={href} style={s.card} key={href}><span style={s.icon}>{icon}</span><div><h2 style={s.h2}>{tr(title)}</h2><p style={s.text}>{tr(text)}</p></div><span style={s.arrow}>→</span></Link>)}</section>
    <div style={{ paddingTop: 28 }}><Link href="/" style={s.back}>{tr("\u2190 Retour \u00E0 l'accueil")}</Link></div>
    </div></main>;
}
const s: Record<string, CSSProperties> = { page: { minHeight: "100vh", padding: "0 18px 70px", background: "linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" }, shell: { maxWidth: 1050, margin: "0 auto" }, header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "22px 0" }, brand: { color: "white", fontWeight: 950, textDecoration: "none", fontSize: 22 }, nav: { display: "flex", gap: 10, flexWrap: "wrap" }, navLink: { color: "#B7C2D2", textDecoration: "none", padding: "10px" }, login: { color: "white", textDecoration: "none", fontWeight: 900, padding: "10px 14px", borderRadius: 13, background: "linear-gradient(135deg,#7C5CFF,#3B82F6,#22D3EE)" }, hero: { padding: "58px 0 30px" }, eyebrow: { color: "#72E7FF", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.4, fontSize: 11 }, title: { fontSize: "clamp(38px,7vw,64px)", lineHeight: 1.02, margin: "10px 0 18px", maxWidth: 850 }, lead: { fontSize: 18, lineHeight: 1.7, color: "#B7C2D2", maxWidth: 760 }, grid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, padding: "22px 0" }, card: { display: "grid", gridTemplateColumns: "46px 1fr auto", alignItems: "center", gap: 14, padding: 20, borderRadius: 20, background: "rgba(15,25,43,.78)", border: "1px solid rgba(148,163,184,.14)", color: "white", textDecoration: "none" }, icon: { fontSize: 27 }, h2: { margin: "0 0 6px", fontSize: 19 }, text: { margin: 0, color: "#B7C2D2", lineHeight: 1.55, fontSize: 14 }, arrow: { color: "#72E7FF", fontSize: 22, fontWeight: 900 }, back: { color: "#72E7FF", textDecoration: "none", fontWeight: 800 } };
