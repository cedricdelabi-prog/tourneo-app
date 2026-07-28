"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [lienValide, setLienValide] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLienValide(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setLienValide(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function modifierMotDePasse() {
    setMessage("");

    if (motDePasse.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    setChargement(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Mot de passe modifié avec succès ✅");

    window.setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main style={styles.page}>
      <section style={styles.carte}>
        <div style={styles.logo}>🏆</div>
        <h1 style={styles.titre}>Nouveau mot de passe</h1>

        {!lienValide ? (
          <p style={styles.message}>
            Ouvre cette page depuis le lien reçu par e-mail.
          </p>
        ) : (
          <>
            <label style={styles.label}>Nouveau mot de passe</label>

            <input
              type="password"
              value={motDePasse}
              onChange={(event) => setMotDePasse(event.target.value)}
              placeholder="6 caractères minimum"
              style={styles.input}
            />

            <label style={styles.label}>Confirmer le mot de passe</label>

            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Confirme ton mot de passe"
              style={styles.input}
            />

            <button
              onClick={modifierMotDePasse}
              disabled={chargement}
              style={styles.bouton}
            >
              {chargement
                ? "Modification..."
                : "Modifier mon mot de passe"}
            </button>
          </>
        )}

        {message && <p style={styles.message}>{message}</p>}

        <button
          style={styles.retour}
          onClick={() => (window.location.href = "/login")}
        >
          Retour à la connexion
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "linear-gradient(145deg,#07101f,#0f172a 45%,#111c33)",
    color: "white",
    fontFamily: "Arial,sans-serif",
  },
  carte: {
    width: "100%",
    maxWidth: 410,
    padding: 28,
    borderRadius: 22,
    background: "#1e293b",
    border: "1px solid #334155",
  },
  logo: {
    textAlign: "center",
    fontSize: 48,
  },
  titre: {
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    display: "block",
    margin: "16px 0 8px",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 11,
    border: "1px solid #64748b",
    fontSize: 16,
  },
  bouton: {
    width: "100%",
    marginTop: 22,
    padding: 14,
    border: 0,
    borderRadius: 11,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  retour: {
    width: "100%",
    marginTop: 14,
    padding: 12,
    border: "none",
    background: "transparent",
    color: "#93c5fd",
    cursor: "pointer",
  },
  message: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#0f172a",
    color: "#bfdbfe",
    textAlign: "center",
  },
};