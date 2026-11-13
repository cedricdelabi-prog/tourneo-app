"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TourneoRetour from "@/components/TourneoRetour";
import TourneoBrand from "@/components/TourneoBrand";
import SelecteurLangue from '@/components/SelecteurLangue';
import SelecteurEspace from '@/components/SelecteurEspace';
import {liensEspace, type Espace} from '@/lib/espace';
const sections = [
    ["/dashboard", "Mes tournois"], ["/evenements", "Événements"],
    ["/groupes", "Groupes"], ["/activite", "Activité"],
    ["/outils", "Outils"], ["/olympiades", "Olympiades"], ["/arbitrage", "Arbitrage"], ["/statistiques", "Statistiques"], ["/profil", "Mon profil"],
] as const;
type Active = "dashboard" | "tournoi" | "profil" | "aide" | "contact" | "none";
export default function TourneoNav({ active = "none", onLogout, primaryLabel, primaryHref, showBack = active === "tournoi", backHref = "/dashboard", backLabel = "Mes tournois", contextLabel }: {
    active?: Active;
    showBack?: boolean;
    backHref?: string;
    backLabel?: string;
    contextLabel?: string;
    onLogout?: () => void | Promise<void>;
    primaryLabel?: string;
    primaryHref?: string;
}) {
    useLangue();
    const pathname = usePathname();
    const [espace,setEspace]=useState<Espace>('organisateur');
    const principaux=liensEspace(espace);
    const accueil=principaux[0];
    const [moreOpen, setMoreOpen] = useState(false);
    const panel = useRef<HTMLDivElement>(null);
    const moreButton = useRef<HTMLButtonElement>(null);
    const selected = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    useEffect(() => {
        if (!moreOpen)
            return;
        const close = (event: PointerEvent) => {
            if (!panel.current?.contains(event.target as Node) && !moreButton.current?.contains(event.target as Node))
                setMoreOpen(false);
        };
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") {
            setMoreOpen(false);
            moreButton.current?.focus();
        } };
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
    }, [moreOpen]);
    return <>
    <header className="tourneo-top-nav">
      <div className="tourneo-nav-heading">
        <Link href={accueil[0]} className="tourneo-brand-link" aria-label={tr("Tourneo — mes tournois")}><TourneoBrand compact/></Link>
        <div className="tourneo-nav-utilities"><SelecteurLangue/><SelecteurEspace onEspace={setEspace}/>
          <Link href="/aide" aria-current={selected("/aide") ? "page" : undefined}>{tr("Aide")}</Link>
          <Link href="/contact" aria-current={selected("/contact") ? "page" : undefined}>{tr("Contact")}</Link>
          {onLogout && <button type="button" onClick={() => void onLogout()}>{tr("D\u00E9connexion")}</button>}
          {tr(primaryLabel) && primaryHref && <Link className="tourneo-nav-primary" href={primaryHref}>{tr(primaryLabel)}</Link>}
        </div>
      </div>
      {showBack && <div className="tourneo-context-bar"><TourneoRetour href={backHref}>{tr(backLabel)}</TourneoRetour>{tr(contextLabel) && <span className="tourneo-context-label">{tr(contextLabel)}</span>}</div>}
      <nav className="tourneo-desktop-nav" aria-label={tr("Navigation principale")}>
        {principaux.map(([href, label]) => <Link key={href} href={href} aria-current={selected(href) ? "page" : undefined}>{tr(label)}</Link>)}
        {espace === 'organisateur' && <details className="tourneo-desktop-more"><summary>{tr("Autres espaces")}</summary><div>{sections.filter(([href]) => !["/dashboard", "/outils", "/activite", "/profil"].includes(href)).map(([href, label]) => <Link key={href} href={href} aria-current={selected(href) ? "page" : undefined}>{tr(label)}</Link>)}</div></details>}
      </nav>
    </header>
    <nav className="tourneo-mobile-bottom-nav" aria-label={tr("Navigation mobile")}>
      <Link href={accueil[0]} aria-current={selected(accueil[0]) ? "page" : undefined}><span aria-hidden="true">⌂</span><small>{tr(accueil[1])}</small></Link>
      <Link href={espace === "organisateur" ? "/tournoi/nouveau" : espace === "arbitre" ? "/outils" : "/activite"}><span aria-hidden="true">＋</span><small>{tr(espace === "organisateur" ? "Créer" : espace === "arbitre" ? "Outils" : "Activité")}</small></Link>
      <Link href="/profil" aria-current={selected("/profil") ? "page" : undefined}><span aria-hidden="true">◎</span><small>{tr("Profil")}</small></Link>
      <button type="button" ref={moreButton} aria-expanded={moreOpen} aria-controls="tourneo-mobile-more" onClick={() => setMoreOpen(v => !v)}><span aria-hidden="true">•••</span><small>{tr("Plus")}</small></button>
    </nav>
    {moreOpen && <div id="tourneo-mobile-more" ref={panel} className="tourneo-mobile-more" aria-label={tr("Autres rubriques")}>
      {(espace === "organisateur" ? sections.slice(1,-1) : principaux.filter(([href]) => href !== "/profil")).map(([href, label]) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} aria-current={selected(href) ? "page" : undefined}>{tr(label)}</Link>)}
      <Link href="/aide" onClick={() => setMoreOpen(false)}>{tr("Aide & s\u00E9curit\u00E9")}</Link>
      <Link href="/contact" onClick={() => setMoreOpen(false)}>{tr("Contact")}</Link>
      {onLogout && <button type="button" onClick={() => { setMoreOpen(false); void onLogout(); }}>{tr("D\u00E9connexion")}</button>}
    </div>}
  </>;
}
