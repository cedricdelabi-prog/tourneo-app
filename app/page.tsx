import type { CSSProperties } from "react";
import Link from "next/link";

export const metadata = {
  title: "Tourneo | Organiser un tournoi sportif facilement",
  description: "Guides, méthodes et outil pour organiser un tournoi sportif : formats, participants, planning, scores, classement et partage public.",
};

const conseils = [
  ["Avant le tournoi", "Définissez le nombre de participants, la durée disponible, le matériel, les règles de départage et l'heure de fin souhaitée."],
  ["Pendant le tournoi", "Centralisez les scores, annoncez clairement les prochains matchs et vérifiez les résultats avant de valider le classement."],
  ["Après le tournoi", "Conservez le classement final, partagez le podium et notez ce qui doit être amélioré pour la prochaine édition."],
];

export default function HomePage() {
  return <main style={s.page}>
    <style>{`
      @media (max-width: 700px) {
        .home-header { flex-direction:column!important; align-items:stretch!important; gap:14px!important; padding:18px 0!important; }
        .home-nav { justify-content:flex-start!important; gap:4px!important; }
        .home-nav a { padding:9px 10px!important; }
        .home-hero { grid-template-columns:minmax(0,1fr)!important; gap:22px!important; padding:38px 0 32px!important; }
        .home-hero-main { min-width:0!important; width:100%!important; }
        .home-title { font-size:clamp(40px,13vw,58px)!important; line-height:1.02!important; letter-spacing:-1.5px!important; word-break:normal!important; overflow-wrap:normal!important; }
        .home-lead { font-size:16px!important; line-height:1.65!important; max-width:none!important; }
        .home-actions { display:grid!important; grid-template-columns:1fr!important; width:100%!important; }
        .home-actions a { width:100%!important; box-sizing:border-box!important; text-align:center!important; }
        .home-hero-card { width:100%!important; box-sizing:border-box!important; padding:22px!important; }
        .home-grid3,.home-grid2 { grid-template-columns:minmax(0,1fr)!important; }
      }
      @media (max-width:420px) {
        .home-nav { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; }
        .home-nav a { text-align:center!important; }
        .home-title { font-size:40px!important; }
      }
    `}</style>
    <div style={s.shell}>
    <header className="home-header" style={s.header}><Link href="/" style={s.brand}>TOURNEO</Link><nav className="home-nav" style={s.nav}><Link href="/guides" style={s.navLink}>Guides</Link><Link href="/formats-tournoi" style={s.navLink}>Formats</Link><Link href="/aide" style={s.navLink}>Aide</Link><Link href="/login" style={s.login}>Se connecter</Link></nav></header>

    <section className="home-hero" style={s.hero}><div className="home-hero-main"><span style={s.eyebrow}>Organisation de tournois</span><h1 className="home-title" style={s.title}>Préparer un tournoi clair, fluide et agréable à suivre.</h1><p className="home-lead" style={s.lead}>Tourneo combine un outil de gestion et des ressources pratiques pour préparer une compétition entre amis, en club, en association, à l'école ou en entreprise. Vous pouvez structurer les participants, choisir un format adapté, saisir les résultats et partager l'avancement sans multiplier les feuilles et tableaux.</p><div className="home-actions" style={s.actions}><Link href="/login" style={s.primary}>Créer un tournoi</Link><Link href="/guides" style={s.secondary}>Lire les guides</Link></div></div><aside className="home-hero-card" style={s.heroCard}><span style={s.cardTag}>Repère rapide</span><h2 style={s.cardTitle}>Les 5 décisions à prendre avant de commencer</h2><ol style={s.list}><li>Combien de joueurs ou d'équipes ?</li><li>Combien de temps est disponible ?</li><li>Tout le monde doit-il jouer plusieurs fois ?</li><li>Faut-il une finale ou un classement complet ?</li><li>Comment départager les égalités ?</li></ol></aside></section>

    <section style={s.section}><span style={s.eyebrow}>Méthode</span><h2 style={s.sectionTitle}>Organiser un tournoi sans oublier l'essentiel</h2><div className="home-grid3" style={s.grid3}>{conseils.map(([t,txt])=><article style={s.card} key={t}><h3 style={s.h3}>{t}</h3><p style={s.text}>{txt}</p></article>)}</div></section>

    <section style={s.section}><span style={s.eyebrow}>Choisir le format</span><h2 style={s.sectionTitle}>Le format change totalement l'expérience des joueurs</h2><div className="home-grid2" style={s.grid2}><article style={s.card}><h3 style={s.h3}>Championnat complet</h3><p style={s.text}>Idéal pour un petit groupe et un classement précis : chacun rencontre tous les autres. Le nombre de matchs augmente rapidement avec le nombre de participants.</p></article><article style={s.card}><h3 style={s.h3}>Poules</h3><p style={s.text}>Utile pour répartir beaucoup de joueurs en groupes plus courts, puis éventuellement qualifier les meilleurs vers une phase finale.</p></article><article style={s.card}><h3 style={s.h3}>Élimination directe</h3><p style={s.text}>Rapide et simple à suivre. Chaque rencontre compte beaucoup, mais certains participants peuvent être éliminés après un seul match.</p></article><article style={s.card}><h3 style={s.h3}>Poules + finale</h3><p style={s.text}>Un compromis fréquent : plusieurs matchs garantis au départ puis une fin de tournoi plus spectaculaire.</p></article></div><div style={{marginTop:18}}><Link href="/formats-tournoi" style={s.secondary}>Comparer les formats en détail</Link></div></section>

    <section style={s.infoBand}><div><span style={s.eyebrow}>Conseil pratique</span><h2 style={{...s.sectionTitle,marginBottom:8}}>Estimez le nombre de matchs avant de lancer le tournoi</h2><p style={s.text}>Dans un championnat à n participants, le nombre de rencontres est n × (n - 1) ÷ 2. Avec 8 participants, cela représente 28 matchs. Cette estimation permet de vérifier si le format choisi tient réellement dans le temps disponible.</p></div></section>

    <section style={s.section}><span style={s.eyebrow}>Ressources</span><h2 style={s.sectionTitle}>Des pages utiles même avant de créer un compte</h2><div className="home-grid3" style={s.grid3}><Link href="/guides" style={s.linkCard}><strong>Guides pratiques</strong><span>Préparation, durée, organisation, scores, communication et fin de tournoi.</span></Link><Link href="/formats-tournoi" style={s.linkCard}><strong>Comparer les formats</strong><span>Avantages, limites et exemples selon le nombre de participants.</span></Link><Link href="/aide" style={s.linkCard}><strong>Centre d'aide</strong><span>Fonctionnement de Tourneo, QR, partage, scores et sécurité.</span></Link></div></section>

    <footer style={s.footer}><div><strong>Tourneo</strong><p style={s.footerText}>Outil et ressources pour organiser des tournois sportifs.</p></div><div style={s.footerLinks}><Link href="/confidentialite" style={s.footerLink}>Confidentialité</Link><Link href="/suppression-compte" style={s.footerLink}>Suppression de compte</Link><Link href="/contact" style={s.footerLink}>Contact</Link></div></footer>
  </div></main>;
}

const s: Record<string,CSSProperties> = {
  page:{minHeight:"100vh",background:"radial-gradient(circle at 15% 5%,rgba(124,92,255,.18),transparent 30%),linear-gradient(145deg,#050811,#0B1220)",color:"#fff",fontFamily:"Inter,system-ui,sans-serif",padding:"0 18px 60px"},shell:{maxWidth:1120,margin:"0 auto"},header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,padding:"22px 0"},brand:{fontSize:22,fontWeight:950,letterSpacing:1.6,color:"#fff",textDecoration:"none"},nav:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"},navLink:{color:"#B7C2D2",textDecoration:"none",fontWeight:750,padding:"10px 12px"},login:{color:"#fff",textDecoration:"none",fontWeight:900,padding:"11px 15px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)"},hero:{display:"grid",gridTemplateColumns:"minmax(0,1.4fr) minmax(280px,.8fr)",gap:30,alignItems:"center",padding:"72px 0 58px"},eyebrow:{color:"#72E7FF",fontSize:12,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},title:{fontSize:"clamp(44px,7vw,76px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 20px"},lead:{fontSize:18,lineHeight:1.75,color:"#B7C2D2"},actions:{display:"flex",gap:12,flexWrap:"wrap",marginTop:28},primary:{display:"inline-block",padding:"13px 18px",borderRadius:14,background:"linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)",color:"#fff",fontWeight:900,textDecoration:"none"},secondary:{display:"inline-block",padding:"13px 18px",borderRadius:14,border:"1px solid rgba(114,231,255,.28)",color:"#72E7FF",fontWeight:850,textDecoration:"none"},heroCard:{padding:26,borderRadius:26,background:"rgba(15,25,43,.82)",border:"1px solid rgba(148,163,184,.16)"},cardTag:{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:1.2,color:"#72E7FF"},cardTitle:{fontSize:25,margin:"8px 0 16px"},list:{color:"#C4CFDD",lineHeight:1.8,paddingLeft:22,margin:0},section:{padding:"42px 0"},sectionTitle:{fontSize:"clamp(30px,5vw,46px)",lineHeight:1.08,margin:"10px 0 24px"},grid3:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14},grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14},card:{padding:24,borderRadius:22,background:"rgba(15,25,43,.76)",border:"1px solid rgba(148,163,184,.14)"},h3:{fontSize:20,margin:"0 0 10px"},text:{color:"#B7C2D2",lineHeight:1.75,margin:0},infoBand:{padding:28,borderRadius:26,background:"linear-gradient(135deg,rgba(124,92,255,.15),rgba(34,211,238,.08))",border:"1px solid rgba(114,231,255,.16)",margin:"32px 0"},linkCard:{display:"flex",flexDirection:"column",gap:8,padding:22,borderRadius:20,background:"rgba(15,25,43,.72)",border:"1px solid rgba(148,163,184,.14)",color:"#fff",textDecoration:"none",lineHeight:1.6},footer:{display:"flex",justifyContent:"space-between",gap:22,flexWrap:"wrap",padding:"38px 0 10px",marginTop:30,borderTop:"1px solid rgba(148,163,184,.14)"},footerText:{color:"#8799B0",margin:"6px 0 0"},footerLinks:{display:"flex",gap:14,flexWrap:"wrap"},footerLink:{color:"#9CB0C7",textDecoration:"none",fontWeight:700}
};
