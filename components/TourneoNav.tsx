"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TourneoBrand from "@/components/TourneoBrand";

const sections = [
  ["/dashboard", "Mes tournois"], ["/evenements", "Événements"],
  ["/groupes", "Groupes"], ["/activite", "Activité"],
  ["/arbitrage", "Arbitrage"], ["/statistiques", "Statistiques"], ["/profil", "Mon profil"],
] as const;
type Active = "dashboard" | "tournoi" | "profil" | "aide" | "contact" | "none";

export default function TourneoNav({ active = "none", onLogout, primaryLabel, primaryHref }: {
  active?: Active; showBack?: boolean; backHref?: string;
  onLogout?: () => void | Promise<void>; primaryLabel?: string; primaryHref?: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const selected = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !moreButton.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMoreOpen(false); moreButton.current?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [moreOpen]);
  return <>
    <header className="tourneo-top-nav">
      <div className="tourneo-nav-heading">
        <Link href="/dashboard" className="tourneo-brand-link" aria-label="Tourneo — mes tournois"><TourneoBrand compact /></Link>
        <div className="tourneo-nav-utilities">
          <Link href="/aide" aria-current={selected("/aide") ? "page" : undefined}>Aide</Link>
          <Link href="/contact" aria-current={selected("/contact") ? "page" : undefined}>Contact</Link>
          {onLogout && <button type="button" onClick={() => void onLogout()}>Déconnexion</button>}
          {primaryLabel && primaryHref && <Link className="tourneo-nav-primary" href={primaryHref}>{primaryLabel}</Link>}
        </div>
      </div>
      <nav className="tourneo-desktop-nav" aria-label="Navigation principale">
        {sections.map(([href, label]) => <Link key={href} href={href} aria-current={selected(href) ? "page" : undefined}>{label}</Link>)}
      </nav>
    </header>
    <nav className="tourneo-mobile-bottom-nav" aria-label="Navigation mobile">
      <Link href="/dashboard" aria-current={selected("/dashboard") ? "page" : undefined}><span aria-hidden="true">⌂</span><small>Accueil</small></Link>
      <Link href="/tournoi/nouveau" aria-current={active === "tournoi" ? "page" : undefined}><span aria-hidden="true">＋</span><small>Créer</small></Link>
      <Link href="/profil" aria-current={selected("/profil") ? "page" : undefined}><span aria-hidden="true">◎</span><small>Profil</small></Link>
      <button type="button" ref={moreButton} aria-expanded={moreOpen} aria-controls="tourneo-mobile-more" onClick={() => setMoreOpen(v => !v)}><span aria-hidden="true">•••</span><small>Plus</small></button>
    </nav>
    {moreOpen && <div id="tourneo-mobile-more" ref={panel} className="tourneo-mobile-more" aria-label="Autres rubriques">
      {sections.slice(1, -1).map(([href, label]) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} aria-current={selected(href) ? "page" : undefined}>{label}</Link>)}
      <Link href="/aide" onClick={() => setMoreOpen(false)}>Aide & sécurité</Link>
      <Link href="/contact" onClick={() => setMoreOpen(false)}>Contact</Link>
      {onLogout && <button type="button" onClick={() => { setMoreOpen(false); void onLogout(); }}>Déconnexion</button>}
    </div>}
  </>;
}
