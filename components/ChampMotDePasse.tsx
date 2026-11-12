"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useId, useState, type InputHTMLAttributes } from "react";
export default function ChampMotDePasse({ id, style, disabled, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
    useLangue();
    const identifiant = useId();
    const champId = id || identifiant;
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const masquer = () => setVisible(false);
        const verifierOnglet = () => { if (document.hidden)
            masquer(); };
        window.addEventListener("blur", masquer);
        document.addEventListener("visibilitychange", verifierOnglet);
        return () => { window.removeEventListener("blur", masquer); document.removeEventListener("visibilitychange", verifierOnglet); };
    }, []);
    return <div style={{ position: "relative", width: "100%" }} onBlur={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setVisible(false);
        }}>
    <input {...props} id={champId} disabled={disabled} type={visible ? "text" : "password"} style={{ ...style, paddingRight: 58 }}/>
    <button type="button" aria-label={visible ? tr("Masquer le mot de passe") : tr("Afficher le mot de passe")} title={visible ? tr("Masquer le mot de passe") : tr("Afficher le mot de passe")} aria-controls={champId} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(v => !v)} style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "grid", placeItems: "center", border: 0, borderRadius: 9, background: "transparent", color: "#94a3b8", cursor: disabled ? "wait" : "pointer" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
        <circle cx="12" cy="12" r="3"/>
        {!visible && <path d="M3 3l18 18"/>}
      </svg>
    </button>
  </div>;
}
