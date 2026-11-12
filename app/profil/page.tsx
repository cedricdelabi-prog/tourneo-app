"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import PhotoPrivee from "@/components/PhotoPrivee";
import { referencePhoto } from "@/lib/media-prive";
import PreferencesCompte from "@/components/PreferencesCompte";
import TourneoNav from "@/components/TourneoNav";

type Profil = {
  id: string;
  display_name: string;
  player_code: string;
  avatar_url?: string | null;
  favorite_color?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
};

export default function ProfilPage() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [ville, setVille] = useState("");
  const [couleur, setCouleur] = useState("#3B82F6");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const inputPhoto = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  // State updates render later: reserve the operation synchronously, before any await.
  const actionProfil = useRef(false);

  useEffect(() => { charger(); }, []);

  async function charger() {
    setChargement(true);
    setMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError || !user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Chargement profil :", error);
      setMessage(`Impossible de charger votre profil : ${error.message}`);
      setChargement(false);
      return;
    }

    if (data) {
      const p = data as Profil;
      setProfil(p);
      setNom(p.display_name || "");
      setPrenom(p.first_name || String(user.user_metadata?.first_name || ""));
      setNomFamille(p.last_name || String(user.user_metadata?.last_name || ""));
      setVille(p.city || String(user.user_metadata?.city || ""));
      setCouleur(p.favorite_color || "#3B82F6");
      setAvatar(p.avatar_url || "");
      setChargement(false);
      return;
    }

    const displayName = String(
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim() ||
      user.email?.split("@")[0] ||
      "Joueur"
    );
    const code = `TRN-${user.id.slice(0,4).toUpperCase()}-${user.id.slice(4,8).toUpperCase()}`;

    const nouveauProfil = {
      id: user.id,
      display_name: displayName,
      player_code: code,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
      city: user.user_metadata?.city || null,
      favorite_color: "#3B82F6",
    };

    const { data: cree, error: creationError } = await supabase
      .from("profiles")
      .upsert(nouveauProfil, { onConflict: "id" })
      .select("*")
      .single();

    if (creationError || !cree) {
      console.error("Création profil :", creationError);
      setMessage(
        creationError?.message
          ? `Impossible de créer votre profil : ${creationError.message}`
          : "Impossible de créer votre profil. Réessayez dans quelques instants."
      );
      setChargement(false);
      return;
    }

    const p = cree as Profil;
    setProfil(p);
    setNom(p.display_name || displayName);
    setPrenom(p.first_name || String(user.user_metadata?.first_name || ""));
    setNomFamille(p.last_name || String(user.user_metadata?.last_name || ""));
    setVille(p.city || String(user.user_metadata?.city || ""));
    setCouleur(p.favorite_color || "#3B82F6");
    setAvatar(p.avatar_url || "");
    setMessage("Profil Tourneo créé. Vous pouvez maintenant le personnaliser.");
    setChargement(false);
  }

  async function changerPhoto(source?: File | (() => Promise<File>)) {
    if (!source || !profil || chargement || actionProfil.current) return;
    actionProfil.current = true;
    setPhotoEnCours(true);
    setMessage("Préparation de l’avatar…");
    try {
      const file = typeof source === "function" ? await source() : source;
      if (!file.type.startsWith("image/")) throw new Error("Choisissez une image valide.");
      if (file.size > 5 * 1024 * 1024) throw new Error("La photo doit peser moins de 5 Mo.");
      setMessage("Envoi de l’avatar…");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
      const path = `${profil.id}/profil-${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from("tourneo-media");
      const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const photo = referencePhoto(path);
      const { data: updated, error: saveError } = await supabase.from("profiles")
        .update({ avatar_url: photo, updated_at: new Date().toISOString() })
        .eq("id", profil.id).select("*").single();
      if (saveError || !updated) throw saveError || new Error("Photo non enregistrée.");
      setProfil(updated as Profil);
      setAvatar(photo);
      setMessage("Avatar de profil enregistré ✓");
    } catch (error) {
      setMessage(error instanceof Error ? `Photo impossible : ${error.message}` : "Impossible d'enregistrer la photo.");
    } finally {
      actionProfil.current = false;
      setPhotoEnCours(false);
      if (inputPhoto.current) inputPhoto.current.value = "";
      if (inputCamera.current) inputCamera.current.value = "";
    }
  }

  async function choisirEmoji(emoji: string) {
    await changerPhoto(async () => {
      // Use the same private image upload as photos, so the avatar works everywhere.
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de préparer cet emoji. Réessayez.");
      context.font = '168px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(emoji, 128, 140);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Impossible de préparer cet emoji. Réessayez.");
      return new File([blob], "avatar-emoji.png", { type: "image/png" });
    });
  }

  async function enregistrer() {
    if (chargement || actionProfil.current) return;
    if (!profil) {
      setMessage("Votre profil n’est pas encore prêt. Réessayez dans quelques instants.");
      return;
    }
    if (!nom.trim()) {
      setMessage("Ajoutez un nom affiché ou un pseudo avant d’enregistrer.");
      return;
    }

    actionProfil.current = true;
    setEnregistrement(true);
    setMessage("Enregistrement…");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: nom.trim(),
          first_name: prenom.trim() || null,
          last_name: nomFamille.trim() || null,
          city: ville.trim() || null,
          favorite_color: couleur,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profil.id)
        .select("*")
        .single();

      if (error || !data) throw error || new Error("Réessayez.");

      setProfil(data as Profil);
      setAvatar(data.avatar_url || "");
      setMessage("Profil enregistré ✓");
    } catch {
      setMessage("Enregistrement impossible. Vérifiez votre connexion puis réessayez.");
    } finally {
      actionProfil.current = false;
      setEnregistrement(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <TourneoNav active="profil" showBack backHref="/dashboard" onLogout={logout} primaryLabel="Créer un tournoi" primaryHref="/tournoi/nouveau" />

        <section className="tourneo-profile-hero" style={s.hero}>
          <div className="tourneo-avatar-picker" style={s.avatarWrap}>
            <div style={{ ...s.avatar, background: couleur }}>
              {avatar ? <PhotoPrivee src={avatar} alt="" style={s.avatarImg} /> : <span>{(nom || "T").slice(0,1).toUpperCase()}</span>}
            </div>
            <input ref={inputPhoto} hidden type="file" accept="image/*,image/gif" onChange={(e) => changerPhoto(e.target.files?.[0])} />
            <input ref={inputCamera} hidden type="file" accept="image/*" capture="user" onChange={(e) => changerPhoto(e.target.files?.[0])} />
            <div className="tourneo-avatar-actions">
              <button type="button" style={s.secondary} disabled={photoEnCours || chargement || enregistrement} onClick={() => inputCamera.current?.click()}>Prendre une photo</button>
              <button type="button" style={s.secondary} disabled={photoEnCours || chargement || enregistrement} onClick={() => inputPhoto.current?.click()}>Galerie / GIF</button>
            </div>
            <span style={{ color: "#b6c6dd", fontSize: 13 }}>Ou choisissez un emoji</span>
            <div className="tourneo-emoji-options" role="group" aria-label="Choisir un emoji comme avatar">
              {[["🙂", "Sourire"], ["😎", "Lunettes"], ["🤩", "Étoiles"], ["🦊", "Renard"], ["🐼", "Panda"], ["🦁", "Lion"], ["⚽", "Football"], ["🏀", "Basket"], ["🏓", "Tennis de table"], ["🎾", "Tennis"], ["🎯", "Cible"], ["🏸", "Badminton"]].map(([emoji, label]) => <button key={emoji} type="button" aria-label={`Choisir : ${label}`} disabled={photoEnCours || chargement || enregistrement} onClick={() => void choisirEmoji(emoji)}>{emoji}</button>)}
            </div>
            <small style={{ color: "#9cafc7", textAlign: "center" }}>Enregistré automatiquement · Image de 5 Mo maximum</small>
            {message && <p role="status" aria-live="polite" style={{ color: "#d5efff", fontSize: 13, textAlign: "center", maxWidth: 260 }}>{message}</p>}
          </div>
          <div style={s.heroCopy}>
            <span style={s.eyebrow}>Profil joueur</span>
            <h1 style={s.title}>{nom || "Mon profil Tourneo"}</h1>
            <p style={s.muted}>Votre identité vous suit dans les tournois : nom, avatar, couleur, QR et futur palmarès.</p>
          </div>
        </section>

        <PreferencesCompte/>
        <section style={s.grid}>
          <article style={s.card}>
            <span style={s.eyebrow}>Identité</span>
            <label style={s.label}>Nom affiché / pseudo</label>
            <input style={s.input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. JeanD" />
            <div style={s.two}>
              <div>
                <label style={s.label}>Prénom</label>
                <input style={s.input} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex. Jean" />
              </div>
              <div>
                <label style={s.label}>Nom</label>
                <input style={s.input} value={nomFamille} onChange={(e) => setNomFamille(e.target.value)} placeholder="Ex. Dupont" />
              </div>
            </div>
            <label style={s.label}>Ville</label>
            <input style={s.input} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Paris (facultatif)" />

            <label style={s.label}>Couleur du profil</label>
            <input style={s.colorInput} type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} />
            <button style={{...s.primary, opacity: enregistrement || chargement ? .65 : 1}} onClick={enregistrer} disabled={enregistrement || chargement || photoEnCours}>{enregistrement ? "Enregistrement…" : chargement ? "Chargement du profil…" : "Enregistrer mon profil"}</button>
            {message && <div style={s.feedback}>{message}</div>}
          </article>

          <article style={s.card}>
            <span style={s.eyebrow}>Carte joueur</span>
            <h2 style={s.cardTitle}>Mon identifiant Tourneo</h2>
            <p style={s.muted}>Montrez ce QR à l’organisateur. Votre nom, votre avatar et votre couleur pourront être ajoutés sans ressaisie.</p>
            {profil && (
              <>
                <div style={s.qr}>
                  <QRCodeSVG value={`${window.location.origin}/joueur/${profil.player_code}`} size={190} />
                </div>
                <strong style={s.code}>{profil.player_code}</strong>
                <button type="button" style={s.secondary} onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(profil.player_code);
                    setMessage("Code joueur copié ✓");
                  } catch {
                    setMessage("Copie indisponible. Sélectionnez votre code joueur pour le copier.");
                  }
                }}>Copier mon code</button>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "22px 18px 80px", background: "radial-gradient(circle at 15% 5%,rgba(124,92,255,.18),transparent 28%),linear-gradient(145deg,#050811,#0B1220)", color: "white", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { width: "100%", maxWidth: 1050, margin: "0 auto" },
  hero: { display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "center", padding: 22, borderRadius: 26, background: "rgba(15,25,43,.75)", border: "1px solid rgba(148,163,184,.14)", marginBottom: 16, overflow: "hidden" },
  avatarWrap: { display: "grid", justifyItems: "center", gap: 8 },
  avatar: { width: 112, height: 112, borderRadius: 30, display: "grid", placeItems: "center", fontSize: 42, fontWeight: 1000, overflow: "hidden", boxShadow: "0 16px 45px rgba(0,0,0,.28)" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  heroCopy: { minWidth: 0, overflow: "hidden" },
  eyebrow: { color: "#72E7FF", fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { margin: "7px 0", fontSize: "clamp(32px,6vw,56px)", overflowWrap: "anywhere" },
  muted: { color: "#8597AF", lineHeight: 1.55, overflowWrap: "anywhere", maxWidth: "100%" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,290px),1fr))", gap: 16 },
  card: { minWidth: 0, padding: 22, borderRadius: 24, background: "rgba(15,25,43,.78)", border: "1px solid rgba(148,163,184,.14)", overflow: "hidden" },
  cardTitle: { margin: "7px 0" },
  label: { display: "block", margin: "14px 0 6px", color: "#B7C2D2", fontSize: 13, fontWeight: 800 },
  input: { width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 13, border: "1px solid rgba(148,163,184,.17)", background: "#07101E", color: "white", fontSize: 16 },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  colorInput: { width: "100%", height: 50, border: 0, borderRadius: 13, background: "#07101E", padding: 5 },
  primary: { width: "100%", marginTop: 18, padding: 14, border: 0, borderRadius: 14, background: "linear-gradient(135deg,#7C5CFF,#3B82F6 55%,#22D3EE)", color: "white", fontWeight: 900, cursor: "pointer" },
  secondary: { padding: "10px 13px", borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "rgba(255,255,255,.035)", color: "white", fontWeight: 800, cursor: "pointer" },
  feedback: { marginTop: 10, color: "#A8EFFF", fontSize: 13 },
  qr: { width: "fit-content", background: "white", padding: 14, borderRadius: 20, margin: "18px auto 12px" },
  code: { display: "block", textAlign: "center", marginBottom: 10, letterSpacing: 1.2, overflowWrap: "anywhere" },
};
