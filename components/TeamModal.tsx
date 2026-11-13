"use client";
import AideInfo from '@/components/AideInfo';
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState } from "react";
import {capitaineEquipe} from '@/lib/equipe-capitaine';
import type { Equipe } from "@/types";
const EMOJIS = ["⚽", "🏀", "🎾", "🏐", "🏓", "🎯", "⭐", "⚡", "👑", "🔥"];
const COULEURS = ["#3B82F6", "#22D3EE", "#7C5CFF", "#16A34A", "#E11D48", "#F59E0B", "#14B8A6", "#F97316"];
const PHOTO_MAX_DIMENSION = 800;
const PHOTO_QUALITY = 0.76;
async function compresserPhoto(fichier: File): Promise<string> {
    if (!fichier.type.startsWith("image/"))
        throw new Error("Le fichier sélectionné n'est pas une image.");
    const url = URL.createObjectURL(fichier);
    try {
        const image = new Image();
        image.decoding = "async";
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Cette photo ne peut pas être lue sur cet appareil."));
            image.src = url;
        });
        const largeurOriginale = image.naturalWidth || image.width;
        const hauteurOriginale = image.naturalHeight || image.height;
        if (!largeurOriginale || !hauteurOriginale)
            throw new Error("Impossible de lire les dimensions de la photo.");
        const ratio = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(largeurOriginale, hauteurOriginale));
        const largeur = Math.max(1, Math.round(largeurOriginale * ratio));
        const hauteur = Math.max(1, Math.round(hauteurOriginale * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx)
            throw new Error("Impossible de préparer la photo.");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, largeur, hauteur);
        ctx.drawImage(image, 0, 0, largeur, hauteur);
        return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
export default function TeamModal({ ouvert, equipeAModifier, onFermer, onAjouter, enCours = false }: {
    ouvert: boolean;
    enCours?: boolean;
    equipeAModifier?: Equipe | null;
    onFermer: () => void;
    onAjouter: (equipe: Equipe) => void;
}) {
    useLangue();
    const [niveau, setNiveau] = useState(1);
    const [position, setPosition] = useState(1);
    const [poule, setPoule] = useState(0);
    const [joueurs, setJoueurs] = useState("");
    const [nom, setNom] = useState("");
    const [capitaine,setCapitaine]=useState(''),[erreurEquipe,setErreurEquipe]=useState('');
    const [emoji, setEmoji] = useState("⚽");
    const [couleur, setCouleur] = useState("#3B82F6");
    const [photo, setPhoto] = useState("");
    const [traitementPhoto, setTraitementPhoto] = useState(false);
    const [erreurPhoto, setErreurPhoto] = useState("");
    const inputNom = useRef<HTMLInputElement>(null);
    const inputPhoto = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!ouvert)
            return;
        setNom(equipeAModifier?.nom ?? "");
        setCapitaine(equipeAModifier?.capitaine||'');setErreurEquipe('');
        setNiveau(equipeAModifier?.niveau ?? 1);
        setPosition(equipeAModifier?.position ?? 1);
        setPoule(equipeAModifier?.poule ?? 0);
        setJoueurs((equipeAModifier?.joueurs ?? []).join("\n"));
        setEmoji(equipeAModifier?.emoji ?? "⚽");
        setCouleur(equipeAModifier?.couleur ?? "#3B82F6");
        setPhoto(equipeAModifier?.photo ?? "");
        setTraitementPhoto(false);
        setErreurPhoto("");
        const timer = window.setTimeout(() => {
            inputNom.current?.focus();
            inputNom.current?.select();
        }, 80);
        return () => window.clearTimeout(timer);
    }, [ouvert, equipeAModifier]);
    if (!ouvert)
        return null;
    async function lirePhoto(fichier?: File) {
        if (!fichier || traitementPhoto)
            return;
        setErreurPhoto("");
        setTraitementPhoto(true);
        try {
            const photoCompressee = await compresserPhoto(fichier);
            setPhoto(photoCompressee);
        }
        catch (error) {
            console.error("Erreur photo participant :", error);
            setErreurPhoto(error instanceof Error ? error.message : "Impossible de traiter cette photo.");
        }
        finally {
            setTraitementPhoto(false);
            if (inputPhoto.current)
                inputPhoto.current.value = "";
        }
    }
    function supprimerPhoto() {
        setPhoto("");
        setErreurPhoto("");
        if (inputPhoto.current)
            inputPhoto.current.value = "";
    }
    function enregistrer() {
        if (traitementPhoto)
            return;
        const propre = nom.trim();
        if (!propre) {
            inputNom.current?.focus();
            return;
        }
        const membres=joueurs.split("\n").map(j=>j.trim()).filter(Boolean).slice(0,12);
        let chef:string|undefined;try{chef=capitaineEquipe(capitaine,membres);}catch(e){setErreurEquipe(e instanceof Error?e.message:'Capitaine invalide.');return;}
        onAjouter({
            id: equipeAModifier?.id ?? crypto.randomUUID(),
            nom: propre,
            capitaine:chef,
            emoji,
            couleur,
            photo: photo || undefined,
            niveau, position, poule: poule || undefined,
            joueurs: joueurs.split("\n").map(j => j.trim()).filter(Boolean).slice(0, 12),
        });
    }
    return (<div style={s.backdrop} onMouseDown={(e) => e.currentTarget === e.target && onFermer()}>
      <section style={s.modal} role="dialog" aria-modal="true" aria-label={tr("Participant")}>
        <header style={s.header}>
          <div>
            <span style={s.eyebrow}>{tr("Participant")}</span>{enCours && <p>{tr("Cette \u00E9quipe conserve sa place et ses r\u00E9sultats. Vous pouvez corriger son nom, ses membres et son avatar.")}</p>}
            <h2 style={s.title}>{equipeAModifier ? tr("Modifier") : tr("Ajouter")}{tr(" un joueur / une \u00E9quipe")}</h2>
          </div>
          <button style={s.close} onClick={onFermer} aria-label={tr("Fermer")}>×</button>
        </header>

        <label style={s.label}>{tr("Nom")}</label>
        <input ref={inputNom} style={s.input} maxLength={100} value={nom} onChange={(e) => setNom(e.target.value)} placeholder={tr("Ex. Les Lions ou Cédric")} onKeyDown={(e) => e.key === "Enter" && enregistrer()}/>

        <details className="tourneo-optional-panel"><summary>{tr("Niveau et placement avancés")}</summary>        <div style={s.two}><label style={s.label}>{tr("Niveau (1 d\u00E9butant, 5 confirm\u00E9)")}<input style={s.input} type="number" min={1} max={5} disabled={enCours} value={niveau} onChange={e => setNiveau(Math.max(1, Math.min(5, Number(e.target.value))))}/></label><label style={s.label}>{tr("Position dans le tirage manuel")}<AideInfo titre="Position dans le tirage manuel">{"Place attribuée uniquement si le tirage est manuel. En tirage aléatoire, ce numéro n’a pas d’effet."}</AideInfo><input style={s.input} type="number" min={1} max={256} disabled={enCours} value={position} onChange={e => setPosition(Math.max(1, Math.min(256, Number(e.target.value))))}/></label><label style={s.label}>{tr("Poule manuelle (0 = automatique)")}<AideInfo titre="Poule manuelle (0 = automatique)">{"Numéro de groupe souhaité en répartition manuelle. Laissez 0 pour une répartition automatique."}</AideInfo><input style={s.input} type="number" min={0} max={128} disabled={enCours} value={poule} onChange={e => setPoule(Math.max(0, Math.min(128, Number(e.target.value))))}/></label></div>
</details>
        <label style={s.label}>{tr("Joueurs de l\u2019\u00E9quipe (pseudos, un par ligne)")}<textarea style={s.input} rows={3} maxLength={1212} value={joueurs} onChange={e => setJoueurs(e.target.value)}/></label>
        <label style={s.label}>{tr('Capitaine d’équipe (facultatif)')}<AideInfo titre="Capitaine d’équipe (facultatif)">{"Personne de contact de cette équipe. Son nom doit figurer parmi les joueurs de l’équipe. Ce rôle ne donne pas les droits d’organisateur."}</AideInfo><input style={s.input} list="tourneo-capitaines" value={capitaine} maxLength={100} onChange={e=>{setCapitaine(e.target.value);setErreurEquipe('');}} placeholder={tr('Nom ou pseudo du capitaine')}/></label><datalist id="tourneo-capitaines">{joueurs.split('\n').map(j=>j.trim()).filter(Boolean).slice(0,12).map((j,i)=><option key={i} value={j}/>)}</datalist>{erreurEquipe&&<p role="alert">{tr(erreurEquipe)}</p>}
        <details className="tourneo-optional-panel"><summary>{tr("Photo et apparence de l’équipe")}</summary>        <div style={s.two}>
          <div>
            <label style={s.label}>{tr("Photo")}</label>
            <input ref={inputPhoto} hidden type="file" accept="image/*" onChange={(e) => void lirePhoto(e.target.files?.[0])}/>
            <button type="button" style={{ ...s.secondary, opacity: traitementPhoto ? 0.65 : 1 }} disabled={traitementPhoto} onClick={() => inputPhoto.current?.click()}>
              {traitementPhoto ? tr("Traitement de la photo…") : photo ? tr("Changer la photo") : tr("Choisir une photo")}
            </button>
          </div>
          <div>
            <label style={s.label}>{tr("Couleur")}</label>
            <div style={s.colors}>
              {COULEURS.map((item) => (<button type="button" key={item} aria-label={item} onClick={() => setCouleur(item)} style={{ ...s.color, background: item, outline: couleur === item ? "3px solid #fff" : "none" }}/>))}
            </div>
          </div>
        </div>

        {tr(erreurPhoto) && <div role="alert" style={s.error}>{tr(erreurPhoto)}</div>}

        {photo ? (<div style={s.previewWrap}>
            <img src={photo} alt={tr("Aperçu du participant")} style={s.preview}/>
            <button type="button" style={s.removePhoto} onClick={supprimerPhoto}>{tr("Retirer la photo")}</button>
          </div>) : (<>
            <label style={s.label}>{tr("Avatar rapide")}</label>
            <div style={s.emojis}>
              {EMOJIS.map((item) => (<button type="button" key={item} style={{ ...s.emoji, borderColor: emoji === item ? "#72E7FF" : "rgba(148,163,184,.14)" }} onClick={() => setEmoji(item)}>{item}</button>))}
            </div>
          </>)}

</details>
        <button type="button" style={{ ...s.primary, opacity: traitementPhoto ? 0.6 : 1 }} disabled={traitementPhoto} onClick={enregistrer}>
          {traitementPhoto ? tr("Préparation de la photo…") : equipeAModifier ? tr("Enregistrer les modifications") : tr("Ajouter le participant")}
        </button>
      </section>
    </div>);
}
const s: Record<string, React.CSSProperties> = {
    backdrop: { position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(2,6,23,.82)", backdropFilter: "blur(12px)" },
    modal: { width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", borderRadius: 26, padding: 22, color: "white", border: "1px solid rgba(148,163,184,.18)", background: "radial-gradient(circle at 10% 0%,rgba(124,92,255,.20),transparent 34%),#0B1323", boxShadow: "0 24px 70px rgba(0,0,0,.46)" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 14 },
    eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" },
    title: { margin: "6px 0 0", fontSize: 24 },
    close: { width: 40, height: 40, borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "rgba(255,255,255,.04)", color: "white", fontSize: 25, cursor: "pointer" },
    label: { display: "block", margin: "18px 0 7px", color: "#B7C2D2", fontWeight: 800, fontSize: 13 },
    input: { width: "100%", boxSizing: "border-box", padding: 14, borderRadius: 14, border: "1px solid rgba(148,163,184,.18)", background: "#07101E", color: "white", fontSize: 17, outline: "none" },
    two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    secondary: { width: "100%", padding: 12, borderRadius: 13, border: "1px solid rgba(114,231,255,.24)", background: "rgba(114,231,255,.06)", color: "#CFF9FF", fontWeight: 800, cursor: "pointer" },
    colors: { display: "flex", flexWrap: "wrap", gap: 8, minHeight: 42, alignItems: "center" },
    color: { width: 30, height: 30, borderRadius: "50%", border: "2px solid #0B1323", cursor: "pointer" },
    previewWrap: { display: "grid", justifyItems: "center", gap: 8, margin: "18px auto 2px" },
    preview: { width: 110, height: 110, borderRadius: 24, objectFit: "cover", display: "block", border: "1px solid rgba(148,163,184,.20)" },
    removePhoto: { border: 0, background: "transparent", color: "#FDA4AF", fontWeight: 800, fontSize: 12, cursor: "pointer" },
    error: { marginTop: 12, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(251,113,133,.35)", background: "rgba(190,24,93,.12)", color: "#FECDD3", fontSize: 13 },
    emojis: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 },
    emoji: { minHeight: 46, borderRadius: 12, border: "1px solid rgba(148,163,184,.14)", background: "#07101E", fontSize: 23, cursor: "pointer" },
    primary: { width: "100%", marginTop: 22, padding: 14, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)", color: "white", fontWeight: 900, fontSize: 16, cursor: "pointer" },
};
