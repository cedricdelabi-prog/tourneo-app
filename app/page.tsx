import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Tourneo | Organisez vos tournois simplement",
  description:
    "Tourneo permet de créer, organiser et suivre des tournois sportifs : participants, matchs, scores, classements, statistiques et partage public.",
};

export default function HomePage() {
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <Link href="/" style={s.brand}>TOURNEO</Link>
          <nav style={s.nav}>
            <Link href="/guides" style={s.navLink}>Guides</Link>
            <Link href="/formats-tournoi" style={s.navLink}>Formats</Link>
            <Link href="/aide" style={s.navLink}>Aide</Link>
            <Link href="/login" style={s.login}>Se connecter</Link>
          </nav>
        </header>

        <section style={s.hero}>
          <div style={s.heroText}>
            <span style={s.eyebrow}>Organisation de tournois sportifs</span>
            <h1 style={s.title}>Créez. Jouez. Suivez. Tout votre tournoi au même endroit.</h1>
            <p style={s.lead}>
              Tourneo aide les organisateurs à préparer un tournoi, enregistrer les participants,
              générer les matchs, saisir les scores et partager les classements simplement.
              L’objectif : passer moins de temps sur les tableaux et plus de temps sur le terrain.
            </p>
            <div style={s.actions}>
              <Link href="/login" style={s.primary}>Créer mon tournoi</Link>
              <Link href="/formats-tournoi" style={s.secondary}>Choisir un format</Link>
            </div>
          </div>

          <aside style={s.heroCard}>
            <span style={s.cardTag}>En pratique</span>
            <h2 style={s.cardTitle}>Un tournoi en 4 étapes</h2>
            <div style={s.step}><strong>01</strong><span>Choisir le sport et le format.</span></div>
            <div style={s.step}><strong>02</strong><span>Ajouter joueurs ou équipes.</span></div>
            <div style={s.step}><strong>03</strong><span>Saisir les résultats au fil des matchs.</span></div>
            <div style={s.step}><strong>04</strong><span>Partager scores, classement et podium.</span></div>
          </aside>
        </section>

        <section style={s.section}>
          <span style={s.eyebrow}>Pourquoi Tourneo ?</span>
          <h2 style={s.sectionTitle}>Un outil pensé pour les tournois du quotidien</h2>
          <div style={s.grid3}>
            <article style={s.card}>
              <h3 style={s.h3}>Organisation plus claire</h3>
              <p style={s.text}>
                Centralisez le nom du tournoi, les participants, les rencontres et les résultats.
                Vous évitez les feuilles éparpillées et les calculs manuels de classement.
              </p>
            </article>
            <article style={s.card}>
              <h3 style={s.h3}>Suivi en temps réel</h3>
              <p style={s.text}>
                Les scores saisis alimentent le classement et les statistiques. Les participants
                peuvent suivre l’avancement via la vue de partage lorsque l’organisateur l’active.
              </p>
            </article>
            <article style={s.card}>
              <h3 style={s.h3}>Compatible avec plusieurs sports</h3>
              <p style={s.text}>
                Football, pétanque, tennis de table, badminton, multisport et bien d’autres :
                Tourneo est conçu pour s’adapter à différents contextes de compétition.
              </p>
            </article>
          </div>
        </section>

        <section style={s.section}>
          <span style={s.eyebrow}>Fonctionnalités</span>
          <h2 style={s.sectionTitle}>Ce que l’organisateur peut gérer</h2>
          <div style={s.grid2}>
            <article style={s.card}>
              <h3 style={s.h3}>Participants et profils</h3>
              <p style={s.text}>
                Ajoutez des joueurs ou des équipes, utilisez les profils Tourneo lorsque disponible
                et retrouvez plus facilement les participants grâce à leur identifiant joueur.
              </p>
            </article>
            <article style={s.card}>
              <h3 style={s.h3}>Matchs et résultats</h3>
              <p style={s.text}>
                Consultez la liste des rencontres, saisissez les scores et suivez la progression
                du tournoi sans recalculer manuellement chaque résultat.
              </p>
            </article>
            <article style={s.card}>
              <h3 style={s.h3}>Classements et statistiques</h3>
              <p style={s.text}>
                Selon le format utilisé, Tourneo calcule automatiquement les éléments nécessaires
                au classement et affiche une vue synthétique de la compétition.
              </p>
            </article>
            <article style={s.card}>
              <h3 style={s.h3}>Partage public</h3>
              <p style={s.text}>
                Une vue en lecture seule peut permettre aux joueurs et spectateurs de consulter
                le tournoi sans leur donner la possibilité de modifier les scores.
              </p>
            </article>
          </div>
        </section>

        <section style={s.infoBand}>
          <div>
            <span style={s.eyebrow}>Bien choisir son format</span>
            <h2 style={{...s.sectionTitle, marginBottom: 8}}>Championnat, poules ou élimination directe ?</h2>
            <p style={s.text}>
              Le bon format dépend surtout du nombre de participants, du temps disponible et du
              niveau de compétition souhaité. Notre guide explique les différences et les cas d’usage.
            </p>
          </div>
          <Link href="/formats-tournoi" style={s.primary}>Voir les formats</Link>
        </section>

        <section style={s.section}>
          <span style={s.eyebrow}>Ressources</span>
          <h2 style={s.sectionTitle}>Préparer un tournoi sans improviser</h2>
          <div style={s.grid3}>
            <Link href="/guides" style={s.linkCard}>
              <strong>Guides Tourneo</strong>
              <span>Organisation, préparation, scores, partage et bonnes pratiques.</span>
            </Link>
            <Link href="/formats-tournoi" style={s.linkCard}>
              <strong>Formats de tournoi</strong>
              <span>Comprendre les avantages de chaque formule avant de lancer la compétition.</span>
            </Link>
            <Link href="/aide" style={s.linkCard}>
              <strong>Centre d’aide</strong>
              <span>QR joueur, sécurité, partage public et fonctionnement général.</span>
            </Link>
          </div>
        </section>

        <footer style={s.footer}>
          <div>
            <strong>Tourneo</strong>
            <p style={s.footerText}>Outil d’organisation et de suivi de tournois sportifs.</p>
          </div>
          <div style={s.footerLinks}>
            <Link href="/confidentialite" style={s.footerLink}>Confidentialité</Link>
            <Link href="/suppression-compte" style={s.footerLink}>Suppression de compte</Link>
            <Link href="/contact" style={s.footerLink}>Contact</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page:{minHeight:"100vh",background:"radial-gradient(circle at 15% 5%,rgba(124,92,255,.18),transparent 30%),linear-gradient(145deg,#050811,#0B1220)",color:"#fff",fontFamily:"Inter,system-ui,sans-serif",padding:"0 18px 60px"},
  shell:{maxWidth:1120,margin:"0 auto"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,padding:"22px 0"},
  brand:{fontSize:22,fontWeight:950,letterSpacing:1.6,color:"#fff",textDecoration:"none"},
  nav:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"},
  navLink:{color:"#B7C2D2",textDecoration:"none",fontWeight:750,padding:"10px 12px"},
  login:{color:"#fff",textDecoration:"none",fontWeight:900,padding:"11px 15px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)"},
  hero:{display:"grid",gridTemplateColumns:"minmax(0,1.45fr) minmax(280px,.75fr)",gap:30,alignItems:"center",padding:"76px 0 64px"},
  heroText:{maxWidth:760},
  eyebrow:{color:"#72E7FF",fontSize:12,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
  title:{fontSize:"clamp(46px,7vw,78px)",lineHeight:.98,letterSpacing:-2.2,margin:"12px 0 20px"},
  lead:{fontSize:18,lineHeight:1.75,color:"#B7C2D2",maxWidth:760},
  actions:{display:"flex",gap:12,flexWrap:"wrap",marginTop:28},
  primary:{display:"inline-block",padding:"13px 18px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",color:"#fff",fontWeight:900,textDecoration:"none"},
  secondary:{display:"inline-block",padding:"13px 18px",borderRadius:14,border:"1px solid rgba(114,231,255,.28)",color:"#72E7FF",fontWeight:850,textDecoration:"none"},
  heroCard:{padding:26,borderRadius:26,background:"rgba(15,25,43,.82)",border:"1px solid rgba(148,163,184,.16)",boxShadow:"0 24px 80px rgba(0,0,0,.25)"},
  cardTag:{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:1.2,color:"#72E7FF"},
  cardTitle:{fontSize:25,margin:"8px 0 18px"},
  step:{display:"grid",gridTemplateColumns:"42px 1fr",gap:10,padding:"13px 0",borderTop:"1px solid rgba(148,163,184,.12)",color:"#C4CFDD",lineHeight:1.5},
  section:{padding:"42px 0"},
  sectionTitle:{fontSize:"clamp(30px,5vw,46px)",lineHeight:1.05,margin:"10px 0 24px",letterSpacing:-1},
  grid3:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14},
  grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14},
  card:{padding:24,borderRadius:22,background:"rgba(15,25,43,.76)",border:"1px solid rgba(148,163,184,.14)"},
  h3:{fontSize:20,margin:"0 0 10px"},
  text:{color:"#B7C2D2",lineHeight:1.75,margin:0},
  infoBand:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:30,flexWrap:"wrap",padding:28,borderRadius:26,background:"linear-gradient(135deg,rgba(124,92,255,.15),rgba(34,211,238,.08))",border:"1px solid rgba(114,231,255,.16)",margin:"32px 0"},
  linkCard:{display:"flex",flexDirection:"column",gap:8,padding:22,borderRadius:20,background:"rgba(15,25,43,.72)",border:"1px solid rgba(148,163,184,.14)",color:"#fff",textDecoration:"none",lineHeight:1.6},
  footer:{display:"flex",justifyContent:"space-between",gap:22,flexWrap:"wrap",padding:"38px 0 10px",marginTop:30,borderTop:"1px solid rgba(148,163,184,.14)"},
  footerText:{color:"#8799B0",margin:"6px 0 0"},
  footerLinks:{display:"flex",gap:14,flexWrap:"wrap"},
  footerLink:{color:"#9CB0C7",textDecoration:"none",fontWeight:700}
};
