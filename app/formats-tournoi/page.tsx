import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Formats de tournoi | Tourneo",
  description:
    "Comparez championnat complet, phase de poules, élimination directe et poules avec phase finale pour choisir le bon format de tournoi.",
};

const items = [
  {
    title:"Championnat complet",
    ideal:"Petit ou moyen groupe, temps disponible",
    principe:"Chaque participant rencontre tous les autres.",
    avantages:"Très lisible et équitable. Le classement reflète l’ensemble des confrontations.",
    attention:"Le nombre de matchs augmente rapidement lorsque le nombre de participants grandit.",
    exemple:"Avec 6 participants, un championnat simple produit 15 rencontres."
  },
  {
    title:"Phase de poules",
    ideal:"Beaucoup de participants",
    principe:"Les joueurs ou équipes sont répartis en plusieurs groupes avec un classement par poule.",
    avantages:"Permet de répartir les rencontres et de garantir plusieurs matchs à chaque participant.",
    attention:"Il faut définir à l’avance combien de participants se qualifient dans chaque poule.",
    exemple:"16 équipes peuvent être réparties en 4 poules de 4 avant une éventuelle suite."
  },
  {
    title:"Élimination directe",
    ideal:"Tournoi rapide ou phase finale",
    principe:"Le gagnant d’une rencontre continue, le perdant est éliminé.",
    avantages:"Simple à comprendre, peu de matchs et forte progression vers une finale.",
    attention:"Un participant peut être éliminé dès son premier match.",
    exemple:"8 participants nécessitent 7 matchs pour désigner un vainqueur."
  },
  {
    title:"Poules + phase finale",
    ideal:"Compétition structurée avec enjeu final",
    principe:"Une première phase de groupes qualifie les meilleurs pour un tableau à élimination directe.",
    avantages:"Combine plusieurs matchs garantis avec une phase finale plus spectaculaire.",
    attention:"Demande davantage de temps et des règles de qualification clairement définies.",
    exemple:"12 équipes peuvent jouer en 3 poules de 4 puis poursuivre en quarts ou demi-finales."
  }
];

export default function FormatsTournoiPage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <Link href="/" style={s.brand}>TOURNEO</Link>
          <nav style={s.nav}>
            <Link href="/" style={s.navLink}>Accueil</Link>
            <Link href="/guides" style={s.navLink}>Guides</Link>
            <Link href="/aide" style={s.navLink}>Aide</Link>
            <Link href="/login" style={s.login}>Se connecter</Link>
          </nav>
        </header>

        <section style={s.hero}>
          <span style={s.eyebrow}>Formats de tournoi</span>
          <h1 style={s.title}>Choisir une formule adaptée au nombre de joueurs et au temps disponible.</h1>
          <p style={s.lead}>
            Le format influence directement le nombre de matchs, l’équité sportive et la durée totale.
            Il n’existe pas un format meilleur que tous les autres : le bon choix dépend du contexte.
          </p>
        </section>

        <section style={s.grid}>
          {items.map((item) => (
            <article key={item.title} style={s.card}>
              <span style={s.pill}>{item.ideal}</span>
              <h2 style={s.h2}>{item.title}</h2>
              <h3 style={s.h3}>Principe</h3>
              <p style={s.text}>{item.principe}</p>
              <h3 style={s.h3}>Avantages</h3>
              <p style={s.text}>{item.avantages}</p>
              <h3 style={s.h3}>À prévoir</h3>
              <p style={s.text}>{item.attention}</p>
              <div style={s.example}><strong>Exemple :</strong> {item.exemple}</div>
            </article>
          ))}
        </section>

        <section style={s.longCard}>
          <span style={s.eyebrow}>Comment décider ?</span>
          <h2 style={s.h2}>Trois questions suffisent souvent</h2>
          <div style={s.questions}>
            <div><strong>1. Combien de participants ?</strong><span>Plus le nombre augmente, plus le championnat complet devient long.</span></div>
            <div><strong>2. Combien de temps avez-vous ?</strong><span>Une demi-journée, une journée ou plusieurs dates changent complètement le format possible.</span></div>
            <div><strong>3. Combien de matchs minimum voulez-vous garantir ?</strong><span>Si chacun doit jouer plusieurs fois, les poules ou le championnat sont généralement plus adaptés.</span></div>
          </div>
        </section>

        <section style={s.longCard}>
          <span style={s.eyebrow}>Exemple pratique</span>
          <h2 style={s.h2}>8 participants et seulement deux heures</h2>
          <p style={s.text}>
            Un championnat complet demanderait 28 rencontres, ce qui peut être trop long.
            Une élimination directe ne demanderait que 7 matchs, mais certains participants ne joueraient
            qu’une fois. Une solution intermédiaire consiste à créer deux poules de quatre puis une phase finale.
            Le choix dépend donc du compromis entre temps disponible et nombre de rencontres souhaité.
          </p>
        </section>

        <section style={s.cta}>
          <div>
            <span style={s.eyebrow}>Prêt à organiser ?</span>
            <h2 style={{...s.h2,marginBottom:6}}>Créez votre tournoi dans Tourneo</h2>
            <p style={s.text}>Choisissez votre sport, votre format et ajoutez les participants.</p>
          </div>
          <Link href="/login" style={s.primary}>Commencer</Link>
        </section>

        <footer style={s.footer}>
          <Link href="/guides" style={s.footerLink}>Guides</Link>
          <Link href="/confidentialite" style={s.footerLink}>Confidentialité</Link>
          <Link href="/suppression-compte" style={s.footerLink}>Suppression de compte</Link>
          <Link href="/contact" style={s.footerLink}>Contact</Link>
        </footer>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page:{minHeight:"100vh",background:"radial-gradient(circle at 12% 0%,rgba(124,92,255,.16),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",color:"#fff",fontFamily:"Inter,system-ui,sans-serif",padding:"0 18px 60px"},
  shell:{maxWidth:1080,margin:"0 auto"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,padding:"22px 0"},
  brand:{fontSize:22,fontWeight:950,letterSpacing:1.6,color:"#fff",textDecoration:"none"},
  nav:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},
  navLink:{color:"#B7C2D2",textDecoration:"none",fontWeight:750,padding:"10px"},
  login:{color:"#fff",textDecoration:"none",fontWeight:900,padding:"11px 15px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)"},
  hero:{padding:"72px 0 42px",maxWidth:880},
  eyebrow:{color:"#72E7FF",fontSize:12,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
  title:{fontSize:"clamp(42px,7vw,68px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 18px"},
  lead:{fontSize:18,lineHeight:1.75,color:"#B7C2D2"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,padding:"18px 0 28px"},
  card:{padding:26,borderRadius:24,background:"rgba(15,25,43,.76)",border:"1px solid rgba(148,163,184,.14)"},
  pill:{display:"inline-block",padding:"7px 10px",borderRadius:999,background:"rgba(114,231,255,.08)",border:"1px solid rgba(114,231,255,.18)",color:"#72E7FF",fontSize:12,fontWeight:850},
  h2:{fontSize:26,lineHeight:1.15,margin:"14px 0 16px"},
  h3:{fontSize:14,color:"#E6EDF6",margin:"18px 0 5px"},
  text:{color:"#B7C2D2",lineHeight:1.78,margin:"0 0 10px"},
  example:{marginTop:18,padding:14,borderRadius:14,background:"rgba(0,0,0,.18)",color:"#C9D4E2",lineHeight:1.65},
  longCard:{padding:28,borderRadius:24,background:"rgba(15,25,43,.7)",border:"1px solid rgba(148,163,184,.14)",margin:"14px 0"},
  questions:{display:"grid",gap:12,marginTop:18},
  cta:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,flexWrap:"wrap",padding:28,borderRadius:24,background:"linear-gradient(135deg,rgba(124,92,255,.15),rgba(34,211,238,.08))",border:"1px solid rgba(114,231,255,.16)",marginTop:28},
  primary:{display:"inline-block",padding:"13px 18px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",color:"#fff",fontWeight:900,textDecoration:"none"},
  footer:{display:"flex",gap:16,flexWrap:"wrap",padding:"36px 0 0",marginTop:30,borderTop:"1px solid rgba(148,163,184,.14)"},
  footerLink:{color:"#9CB0C7",textDecoration:"none",fontWeight:700}
};
