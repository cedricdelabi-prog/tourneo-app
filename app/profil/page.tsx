"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
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
  const inputPhoto = useRef<HTMLInputElement>(null);

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

  async function changerPhoto(file?: File) {
    if (!file || !profil) return;
    setMessage("Envoi de la photo…");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profil.id}/profil-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tourneo-media").upload(path, file, { upsert: true });
    if (error) { setMessage(error.message); return; }
    const { data } = supabase.storage.from("tourneo-media").getPublicUrl(path);
    setAvatar(data.publicUrl);
    setMessage("Photo prête. Enregistrez votre profil.");
  }

  async function enregistrer() {
    if (!profil) {
      setMessage("Votre profil n’est pas encore prêt. Réessayez dans quelques instants.");
      return;
    }
    if (!nom.trim()) {
      setMessage("Ajoutez un nom affiché ou un pseudo avant d’enregistrer.");
      return;
    }

    setEnregistrement(true);
    setMessage("Enregistrement…");

    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: nom.trim(),
        first_name: prenom.trim() || null,
        last_name: nomFamille.trim() || null,
        city: ville.trim() || null,
        avatar_url: avatar || null,
        favorite_color: couleur,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profil.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Enregistrement profil :", error);
      setMessage(error?.message ? `Enregistrement impossible : ${error.message}` : "Enregistrement impossible. Réessayez.");
      setEnregistrement(false);
      return;
    }

    setProfil(data as Profil);
    setMessage("Profil enregistré ✓");
    setEnregistrement(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <TourneoNav active="profil" showBack backHref="/dashboard" onLogout={logout} primaryLabel="Créer un tournoi" primaryHref="/tournoi/nouveau" />

        <section style={s.hero}>
          <div style={s.avatarWrap}>
            <div style={{ ...s.avatar, background: couleur }}>
              {avatar ? <img src={avatar} alt="" style={s.avatarImg} /> : <span>{(nom || "T").slice(0,1).toUpperCase()}</span>}
            </div>
            <input ref={inputPhoto} hidden type="file" accept="image/*,image/gif" onChange={(e) => changerPhoto(e.target.files?.[0])} />
            <button style={s.secondary} onClick={() => inputPhoto.current?.click()}>Photo / GIF</button>
          </div>
          <div style={s.heroCopy}>
            <span style={s.eyebrow}>Profil joueur</span>
            <h1 style={s.title}>{nom || "Mon profil Tourneo"}</h1>
            <p style={s.muted}>Votre identité vous suit dans les tournois : nom, avatar, couleur, QR et futur palmarès.</p>
          </div>
        </section>

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
            <button style={{...s.primary, opacity: enregistrement || chargement ? .65 : 1}} onClick={enregistrer} disabled={enregistrement || chargement}>{enregistrement ? "Enregistrement…" : chargement ? "Chargement du profil…" : "Enregistrer mon profil"}</button>
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
                <button style={s.secondary} onClick={() => navigator.clipboard.writeText(profil.player_code)}>Copier mon code</button>
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 },
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
