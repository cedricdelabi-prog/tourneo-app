"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import TourneoBrand from "@/components/TourneoBrand";

type Active = "dashboard" | "tournoi" | "profil" | "aide" | "contact" | "none";

export default function TourneoNav({
  active = "none",
  showBack: _showBack = false,
  backHref: _backHref = "/dashboard",
  onLogout,
  primaryLabel,
  primaryHref,
}: {
  active?: Active;
  showBack?: boolean;
  backHref?: string;
  onLogout?: () => void | Promise<void>;
  primaryLabel?: string;
  primaryHref?: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  function go(href: string) {
    window.location.href = href;
  }

  return (
    <>
      <header style={s.header} className="tourneo-top-nav">
        <div style={s.left}>
          <TourneoBrand compact />
        </div>

        <nav style={s.desktopActions} className="tourneo-desktop-nav">
          <button style={button(active === "dashboard")} onClick={() => go("/dashboard")}>Mes tournois</button>
          <button style={button(active === "profil")} onClick={() => go("/profil")}>Mon profil</button>
          <button style={button(active === "aide")} onClick={() => go("/aide")}>Aide</button>
          <button style={button(active === "contact")} onClick={() => go("/contact")}>Contact</button>
          {onLogout && <button style={button(false)} onClick={() => onLogout()}>Déconnexion</button>}
          {primaryLabel && primaryHref && (
            <button style={s.primary} onClick={() => go(primaryHref)}>{primaryLabel}</button>
          )}
        </nav>
      </header>

      <nav className="tourneo-mobile-bottom-nav" style={s.mobileBottom}>
        <button className={active === "dashboard" ? "is-active" : ""} onClick={() => go("/dashboard")}>
          <span>⌂</span><small>Accueil</small>
        </button>
        <button className={active === "tournoi" ? "is-active" : ""} onClick={() => go("/tournoi/nouveau")}>
          <span>＋</span><small>Créer</small>
        </button>
        <button className={active === "profil" ? "is-active" : ""} onClick={() => go("/profil")}>
          <span>◎</span><small>Profil</small>
        </button>
        <button className={moreOpen ? "is-active" : ""} onClick={() => setMoreOpen((v) => !v)}>
          <span>•••</span><small>Plus</small>
        </button>
      </nav>

      {moreOpen && (
        <div className="tourneo-mobile-more" style={s.morePanel}>
          <button onClick={() => go("/aide")}>Aide & sécurité</button>
          <button onClick={() => go("/contact")}>Contactez-nous</button>
          {onLogout && <button onClick={() => onLogout()}>Déconnexion</button>}
        </div>
      )}

      <style jsx global>{`
        .tourneo-mobile-bottom-nav,
        .tourneo-mobile-more { display: none !important; }

        @media (max-width: 760px) {
          .tourneo-top-nav {
            position: relative !important;
            top: auto !important;
            min-height: 64px !important;
            padding: 10px 2px !important;
            margin-bottom: 14px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .tourneo-desktop-nav { display: none !important; }

          .tourneo-mobile-bottom-nav {
            display: grid !important;
            position: fixed !important;
            left: 10px !important;
            right: 10px !important;
            bottom: max(10px, env(safe-area-inset-bottom)) !important;
            grid-template-columns: repeat(4, 1fr) !important;
            padding: 8px !important;
            border-radius: 22px !important;
            background: rgba(7, 12, 24, .94) !important;
            border: 1px solid rgba(148,163,184,.18) !important;
            backdrop-filter: blur(18px) !important;
            z-index: 120 !important;
            box-shadow: 0 18px 50px rgba(0,0,0,.35) !important;
          }

          .tourneo-mobile-bottom-nav button {
            display: grid;
            place-items: center;
            gap: 2px;
            min-height: 48px;
            padding: 5px 4px;
            border: 0;
            border-radius: 15px;
            background: transparent;
            color: #8798B0;
            font: inherit;
          }

          .tourneo-mobile-bottom-nav button span {
            font-size: 21px;
            line-height: 1;
          }

          .tourneo-mobile-bottom-nav button small {
            font-size: 10px;
            font-weight: 800;
          }

          .tourneo-mobile-bottom-nav button.is-active {
            color: white;
            background: linear-gradient(135deg, rgba(124,92,255,.28), rgba(34,211,238,.18));
          }

          .tourneo-mobile-more {
            display: grid !important;
            position: fixed !important;
            left: 18px !important;
            right: 18px !important;
            bottom: 86px !important;
            padding: 10px !important;
            gap: 6px !important;
            border-radius: 20px !important;
            background: rgba(9, 16, 31, .98) !important;
            border: 1px solid rgba(148,163,184,.18) !important;
            z-index: 121 !important;
            box-shadow: 0 18px 50px rgba(0,0,0,.4) !important;
          }

          .tourneo-mobile-more button {
            padding: 13px 14px;
            text-align: left;
            border: 0;
            border-radius: 14px;
            color: white;
            background: rgba(255,255,255,.04);
            font-weight: 800;
          }

          main { padding-bottom: 100px !important; }
        }
      `}</style>
    </>
  );
}

function button(active: boolean): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: active ? "1px solid rgba(114,231,255,.28)" : "1px solid transparent",
    background: active ? "rgba(114,231,255,.08)" : "transparent",
    color: active ? "#E9FCFF" : "#A1AFC2",
    fontWeight: 800,
    cursor: "pointer",
  };
}

const s: Record<string, CSSProperties> = {
  header: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 22,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  back: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    border: "1px solid rgba(148,163,184,.16)",
    background: "rgba(255,255,255,.035)",
    color: "white",
    cursor: "pointer",
    fontSize: 22,
  },
  desktopActions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primary: {
    padding: "11px 15px",
    border: 0,
    borderRadius: 13,
    background: "linear-gradient(135deg,#7C5CFF,#3B82F6 54%,#22D3EE)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(59,130,246,.22)",
  },
  mobileBottom: {},
  morePanel: {},
};
