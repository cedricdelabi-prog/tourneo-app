"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TourneoBrand from "@/components/TourneoBrand";
import SelecteurLangue from "@/components/SelecteurLangue";
import { tr, trModele, useLangue } from "@/lib/langue";
import styles from "./DecouvrirTourneo.module.css";
import CompteurCommunaute from "@/components/CompteurCommunaute";

const ecrans = [
  {
    repere: "LE PLAISIR DE SE RETROUVER", titre: "Un tournoi. Tout le monde dans le jeu.",
    texte: "Entre amis, au club, au camping ou à l’école : Tourneo vous aide à organiser les rencontres et à partager les bons moments.",
    atouts: ["Plusieurs sports et jeux", "Joueurs et équipes", "Sur téléphone et ordinateur"],
    legende: "Votre prochain tournoi commence ici.",
  },
  {
    repere: "POUR LES ORGANISATEURS", titre: "Moins de préparation. Plus de plaisir.",
    texte: "Choisissez votre jeu, réglez votre tournoi et ajoutez les participants. Tourneo vous aide à choisir une formule, puis prépare les rencontres.",
    atouts: ["Une création étape par étape", "Des formats selon votre groupe", "Scores et classement réunis"],
    legende: "Une organisation claire, du premier match au podium.",
  },
  {
    repere: "POUR LES JOUEURS", titre: "Prêts à jouer ? Tout est là.",
    texte: "Retrouvez les rencontres, les résultats et le classement depuis le lien du tournoi. Chacun peut suivre l’aventure, sur son propre écran.",
    atouts: ["Les rencontres à portée de main", "Les résultats faciles à retrouver", "Le plaisir de progresser ensemble"],
    legende: "Le terrain pour jouer. Tourneo pour se repérer.",
  },
  {
    repere: "POUR LES SPECTATEURS AUSSI", titre: "Faites vibrer tout le tournoi.",
    texte: "Une affiche, un QR code, un lien à partager : invitez le public à suivre les matchs et à pronostiquer gratuitement si l’organisateur active cette option.",
    atouts: ["Un accès public par QR code", "Des favoris à suivre sans compte", "Des pronostics pour participer"],
    legende: "Créez. Jouez. Gagnez. Et partagez.",
  },
] as const;

function FlechePartage() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>;
}

function Apercu({ ecran }: { ecran: number }) {
  return <div className={styles.apercu} aria-hidden="true">
    <div className={styles.apercuEntete}><span>TOURNEO</span><span className={styles.exemple}>{tr("Aperçu illustratif")}</span></div>
    {ecran === 0 ? <div className={styles.terrain}>
      <div className={styles.cercle}/><div className={styles.ligne}/>
      <span className={`${styles.pion} ${styles.pionA}`}>01</span><span className={`${styles.pion} ${styles.pionB}`}>02</span>
      <span className={styles.terrainTexte}>{tr("À vous de jouer.")}</span>
      <div className={styles.sports}><span>{tr("Pétanque")}</span><span>{tr("Football")}</span><span>{tr("Badminton")}</span><span>{tr("Et bien d’autres")}</span></div>
    </div> : ecran === 1 ? <div className={styles.configuration}>
      <span className={styles.petitTitre}>{tr("Mon prochain tournoi")}</span>
      {["Choisir mon jeu", "Régler mon tournoi", "Ajouter les participants"].map((t, i) => <div key={t} className={styles.etape}><b>{String(i + 1).padStart(2, "0")}</b><span>{tr(t)}</span><span className={styles.coche}>✓</span></div>)}
      <div className={styles.pret}>{tr("Les rencontres sont prêtes.")} <span><FlechePartage/></span></div>
    </div> : ecran === 2 ? <div className={styles.rencontres}>
      <span className={styles.petitTitre}>{tr("Les rencontres")}</span>
      <div className={styles.match}><span>{tr("Équipe bleue")}</span><strong>13 <i>–</i> 9</strong><span>{tr("Équipe turquoise")}</span></div>
      <div className={styles.aSuivre}><span>{tr("À suivre")}</span><b>{tr("Terrain 2")}</b></div>
      <div className={styles.podium}><span>2</span><span>1 <small>★</small></span><span>3</span></div>
    </div> : <div className={styles.public}>
      <div className={styles.partageIcone}><FlechePartage/></div><span className={styles.petitTitre}>{tr("Le tournoi se partage.")}</span>
      {["Suivre les matchs", "Choisir mes favoris", "Faire mon pronostic"].map((t, i) => <div key={t} className={styles.lienPublic}><span>{["◉", "☆", "⚑"][i]}</span>{tr(t)}<b><FlechePartage/></b></div>)}
      <small>{tr("Un lien pour réunir tout le monde.")}</small>
    </div>}
  </div>;
}

export default function DecouvrirTourneo() {
  useLangue();
  const [ecran, setEcran] = useState(0);
  const [lecture, setLecture] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [focus, setFocus] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mouvementReduit, setMouvementReduit] = useState(true);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const courant = ecrans[ecran];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changerMouvement = () => setMouvementReduit(media.matches);
    const changerVisibilite = () => setVisible(!document.hidden);
    changerMouvement(); changerVisibilite();
    try { setLecture(localStorage.getItem("tourneo-decouverte-v1") !== "vue"); } catch { setLecture(true); }
    media.addEventListener("change", changerMouvement);
    document.addEventListener("visibilitychange", changerVisibilite);
    return () => { media.removeEventListener("change", changerMouvement); document.removeEventListener("visibilitychange", changerVisibilite); };
  }, []);

  useEffect(() => {
    if (!lecture || survol || focus || !visible || mouvementReduit) return;
    const minuterie = window.setTimeout(() => setEcran(i => (i + 1) % ecrans.length), 9000);
    return () => window.clearTimeout(minuterie);
  }, [ecran, lecture, survol, focus, visible, mouvementReduit]);

  function choisir(index: number) { setLecture(false); setEcran((index + ecrans.length) % ecrans.length); }
  function terminer() { try { localStorage.setItem("tourneo-decouverte-v1", "vue"); } catch {} }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.entete}>
        <Link href="/" aria-label={tr("Accueil Tourneo")} className={styles.logo}><TourneoBrand compact/></Link>
        <div className={styles.utilitaires}><SelecteurLangue/><nav className={styles.acces} aria-label={tr("Accès au compte")}><Link href="/login" onClick={terminer} className={styles.connexion}>{tr("Se connecter")}</Link><Link href="/login?mode=inscription" onClick={terminer} className={styles.inscription}>{tr("S’inscrire")} <span aria-hidden="true"><FlechePartage/></span></Link></nav></div>
      </header>
      <section className={styles.presentation} aria-label={tr("Découvrir Tourneo")} aria-roledescription={tr("Carrousel")}
        onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
        onFocusCapture={() => { setFocus(true); setLecture(false); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}
        onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); choisir(ecran + (event.key === "ArrowRight" ? 1 : -1)); } }}>
        <div className={styles.barre}><span>{tr("L’esprit Tourneo")}</span><Link href="/login" onClick={terminer}>{tr("Passer la présentation")} <span aria-hidden="true">→</span></Link></div>
        <div className={styles.contenu} onPointerDown={event => { if (event.pointerType === "touch") depart.current = { x: event.clientX, y: event.clientY }; }}
          onPointerCancel={() => { depart.current = null; }} onPointerUp={event => { const d = depart.current; depart.current = null; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) choisir(ecran + (dx < 0 ? 1 : -1)); }}>
          <div className={styles.texte} aria-live={lecture ? "off" : "polite"} aria-atomic="true">
            <p className={styles.repere}>{tr(courant.repere)}</p>
            <h1>{tr(courant.titre)}</h1>
            <p className={styles.description}>{tr(courant.texte)}</p>
            <ul className={styles.atouts}>{courant.atouts.map(t => <li key={t}><span aria-hidden="true">✓</span>{tr(t)}</li>)}</ul>
            <div className={styles.actions}><Link href="/login?mode=inscription" onClick={terminer} className={styles.principal}>{tr(ecran === 3 ? "C’est parti !" : "Créer mon tournoi")} <span aria-hidden="true"><FlechePartage/></span></Link>
              {ecran === 0 && <button type="button" onClick={() => choisir(1)} className={styles.secondaire}>{tr("Découvrir Tourneo")} <span aria-hidden="true">→</span></button>}</div>
            <CompteurCommunaute/>
          </div>
          <div className={styles.visuel}><Apercu ecran={ecran}/><p>{tr(courant.legende)}</p></div>
        </div>
        <div className={styles.commandes}>
          <div className={styles.pagination} role="group" aria-label={tr("Les 4 écrans de présentation")}>{ecrans.map((item, i) => <button type="button" key={item.repere} onClick={() => choisir(i)} aria-label={trModele("Écran {0} : {1}", i + 1, tr(item.repere))} aria-current={i === ecran ? "step" : undefined}><span/></button>)}</div>
          <span className={styles.compteur}>{String(ecran + 1).padStart(2, "0")} <span>/ 04</span></span>
          <div className={styles.fleches}>
            {!mouvementReduit && <button type="button" aria-label={tr(lecture ? "Mettre la présentation en pause" : "Lancer le défilement automatique")} aria-pressed={lecture} onClick={() => setLecture(v => !v)}>{lecture ? "Ⅱ" : "▷"}</button>}
            <button type="button" aria-label={tr("Écran précédent")} onClick={() => choisir(ecran - 1)}>←</button><button type="button" aria-label={tr("Écran suivant")} onClick={() => choisir(ecran + 1)}>→</button>
          </div>
        </div>
      </section>
      <footer className={styles.pied}><span>{tr("Pour les petits défis et les grands moments.")}</span><nav aria-label={tr("En savoir plus")}><Link href="/guides">{tr("Guides")}</Link><Link href="/regles">{tr("Règles des jeux")}</Link><Link href="/contact">{tr("Contact")}</Link><Link href="/confidentialite">{tr("Confidentialité")}</Link></nav></footer>
    </div>
  </main>;
}
