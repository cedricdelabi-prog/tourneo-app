import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Guides Tourneo | Organiser un tournoi",
  description:
    "Conseils pratiques pour préparer, lancer, suivre et partager un tournoi sportif avec Tourneo.",
};

const guides = [
  {
    n:"01",
    title:"Préparer le tournoi avant le jour J",
    text:"Définissez le sport, le nombre de participants, le temps disponible, les terrains ou tables disponibles et la manière de départager les égalités. Plus ces règles sont claires avant le premier match, moins vous aurez de décisions à improviser pendant la compétition."
  },
  {
    n:"02",
    title:"Choisir le bon format",
    text:"Un championnat complet favorise l’équité car chacun rencontre tous les autres. Les poules facilitent l’organisation d’un grand nombre de participants. L’élimination directe réduit le nombre de matchs. Le format poules + phase finale combine temps de jeu et enjeu."
  },
  {
    n:"03",
    title:"Construire une liste de participants propre",
    text:"Utilisez des noms distincts et cohérents pour éviter les doublons. Lorsque les profils Tourneo sont utilisés, l’identifiant joueur permet de rattacher plus facilement une personne à son profil et de limiter les erreurs de saisie."
  },
  {
    n:"04",
    title:"Saisir les scores au bon moment",
    text:"Le plus simple est de valider le résultat juste après chaque rencontre. Cela permet au classement de rester à jour et évite de devoir reconstituer les scores plusieurs matchs plus tard."
  },
  {
    n:"05",
    title:"Partager sans donner les droits de modification",
    text:"La vue publique de Tourneo est pensée pour la consultation. Les participants et spectateurs peuvent suivre les résultats et le classement sans disposer des mêmes droits que l’organisateur."
  },
  {
    n:"06",
    title:"Gérer une égalité ou un litige",
    text:"Tourneo est un outil d’organisation et de calcul. Les règles du tournoi restent sous la responsabilité de l’organisateur. En cas de litige sportif, la règle définie avant le tournoi et la décision de l’organisateur doivent rester la référence."
  }
];

export default function GuidesPage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <Link href="/" style={s.brand}>TOURNEO</Link>
          <nav style={s.nav}>
            <Link href="/" style={s.navLink}>Accueil</Link>
            <Link href="/formats-tournoi" style={s.navLink}>Formats</Link>
            <Link href="/aide" style={s.navLink}>Aide</Link>
            <Link href="/login" style={s.login}>Se connecter</Link>
          </nav>
        </header>

        <section style={s.hero}>
          <span style={s.eyebrow}>Guides Tourneo</span>
          <h1 style={s.title}>Mieux organiser un tournoi, du premier participant au podium.</h1>
          <p style={s.lead}>
            Une bonne application ne remplace pas une bonne préparation. Ces conseils expliquent
            comment structurer un tournoi de manière simple, lisible et équitable.
          </p>
        </section>

        <section style={s.grid}>
          {guides.map((g) => (
            <article key={g.n} style={s.card}>
              <span style={s.num}>{g.n}</span>
              <h2 style={s.h2}>{g.title}</h2>
              <p style={s.text}>{g.text}</p>
            </article>
          ))}
        </section>

        <section style={s.longCard}>
          <span style={s.eyebrow}>Checklist organisateur</span>
          <h2 style={s.h2}>Les vérifications utiles avant de démarrer</h2>
          <ul style={s.list}>
            <li>Confirmer la liste finale des joueurs ou équipes.</li>
            <li>Vérifier le format du tournoi et le nombre de matchs attendu.</li>
            <li>Définir les règles de points, d’égalité et de qualification.</li>
            <li>Prévoir qui est autorisé à saisir ou valider les résultats.</li>
            <li>Tester le lien ou QR de partage avant l’arrivée des participants.</li>
            <li>Conserver une solution de secours pour les résultats importants.</li>
          </ul>
        </section>

        <section style={s.longCard}>
          <span style={s.eyebrow}>Pendant le tournoi</span>
          <h2 style={s.h2}>Garder un classement fiable</h2>
          <p style={s.text}>
            La meilleure habitude consiste à saisir les résultats dans un ordre régulier.
            L’organisateur doit vérifier qu’un score correspond à la bonne rencontre avant de le valider.
            En cas de correction, il est préférable de la faire immédiatement afin que les joueurs
            ne consultent pas un classement temporairement erroné.
          </p>
          <p style={s.text}>
            Pour une compétition avec beaucoup de rencontres, désignez une personne responsable de la
            saisie ou organisez un point de collecte des scores. Cela réduit les doublons et les erreurs.
          </p>
        </section>

        <section style={s.cta}>
          <div>
            <span style={s.eyebrow}>Étape suivante</span>
            <h2 style={{...s.h2,marginBottom:6}}>Quel format choisir ?</h2>
            <p style={s.text}>Comparez championnat, poules, élimination directe et format mixte.</p>
          </div>
          <Link href="/formats-tournoi" style={s.primary}>Comparer les formats</Link>
        </section>

        <footer style={s.footer}>
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
  shell:{maxWidth:1050,margin:"0 auto"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,padding:"22px 0"},
  brand:{fontSize:22,fontWeight:950,letterSpacing:1.6,color:"#fff",textDecoration:"none"},
  nav:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},
  navLink:{color:"#B7C2D2",textDecoration:"none",fontWeight:750,padding:"10px"},
  login:{color:"#fff",textDecoration:"none",fontWeight:900,padding:"11px 15px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)"},
  hero:{padding:"72px 0 42px",maxWidth:840},
  eyebrow:{color:"#72E7FF",fontSize:12,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
  title:{fontSize:"clamp(42px,7vw,68px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 18px"},
  lead:{fontSize:18,lineHeight:1.75,color:"#B7C2D2"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14,padding:"18px 0 36px"},
  card:{padding:24,borderRadius:22,background:"rgba(15,25,43,.76)",border:"1px solid rgba(148,163,184,.14)"},
  num:{display:"inline-block",color:"#72E7FF",fontSize:12,fontWeight:950,letterSpacing:1.2,marginBottom:12},
  h2:{fontSize:24,lineHeight:1.15,margin:"0 0 12px"},
  text:{color:"#B7C2D2",lineHeight:1.78,margin:"0 0 14px"},
  longCard:{padding:28,borderRadius:24,background:"rgba(15,25,43,.7)",border:"1px solid rgba(148,163,184,.14)",margin:"14px 0"},
  list:{color:"#B7C2D2",lineHeight:1.9,paddingLeft:22,marginBottom:0},
  cta:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,flexWrap:"wrap",padding:28,borderRadius:24,background:"linear-gradient(135deg,rgba(124,92,255,.15),rgba(34,211,238,.08))",border:"1px solid rgba(114,231,255,.16)",marginTop:28},
  primary:{display:"inline-block",padding:"13px 18px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",color:"#fff",fontWeight:900,textDecoration:"none"},
  footer:{display:"flex",gap:16,flexWrap:"wrap",padding:"36px 0 0",marginTop:30,borderTop:"1px solid rgba(148,163,184,.14)"},
  footerLink:{color:"#9CB0C7",textDecoration:"none",fontWeight:700}
};
