"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  label?: string;
  compact?: boolean;
};

export default function AdSlot({ label = "Publicité", compact = false }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

  useEffect(() => {
    if (!client || !slot) return;

    const id = "tourneo-adsense-script";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      document.head.appendChild(script);
    }

    const timer = window.setTimeout(() => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        // La régie peut refuser un rendu en local ou avant validation du compte.
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [client, slot]);

  if (!client || !slot) {
    return (
      <aside style={{ ...styles.placeholder, ...(compact ? styles.compact : {}) }}>
        <span style={styles.badge}>{label}</span>
        <strong style={styles.title}>Espace publicitaire</strong>
        <span style={styles.muted}>La régie automatique apparaîtra ici une fois votre compte publicitaire connecté.</span>
      </aside>
    );
  }

  return (
    <aside style={{ ...styles.live, ...(compact ? styles.compact : {}) }}>
      <span style={styles.badge}>{label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: compact ? 70 : 90 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  placeholder: {
    minHeight: 90,
    display: "grid",
    alignContent: "center",
    gap: 4,
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,.12)",
    background: "linear-gradient(135deg,rgba(124,92,255,.07),rgba(34,211,238,.035))",
  },
  live: {
    minHeight: 90,
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,.12)",
    background: "rgba(255,255,255,.02)",
    overflow: "hidden",
  },
  compact: { minHeight: 70 },
  badge: {
    color: "#72e7ff",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: { fontSize: 15 },
  muted: { color: "#7f93ac", fontSize: 12 },
};
