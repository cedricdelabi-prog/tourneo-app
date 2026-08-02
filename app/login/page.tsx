"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function envoyer() {
    setMessage("");
    setChargement(true);

    if (!email || !password) {
      setMessage("Merci de remplir l’e-mail et le mot de passe.");
      setChargement(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      setChargement(false);
      return;
    }

    if (mode === "inscription") {
    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
 emailRedirectTo: window.location.origin,
  },
});

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Compte créé ! Vérifie maintenant ta boîte mail pour confirmer ton adresse."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage("E-mail ou mot de passe incorrect.");
      } else {
        window.location.href = "/";
      }
    }

    setChargement(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        background: "#0f172a",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 30,
          borderRadius: 20,
          background: "#1e293b",
          border: "1px solid #334155",
        }}
      >
        <div style={{ textAlign: "center", fontSize: 50 }}>🏆</div>

        <h1 style={{ textAlign: "center", marginBottom: 8 }}>Tourneo</h1>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginBottom: 25,
          }}
        >
          {mode === "connexion"
            ? "Connecte-toi à ton compte"
            : "Crée ton compte gratuitement"}
        </p>

        <label style={{ display: "block", marginBottom: 6 }}>E-mail</label>

        <input
          type="email"
          placeholder="exemple@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 15,
            borderRadius: 8,
            border: "1px solid #475569",
          }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>
          Mot de passe
        </label>

        <input
          type="password"
          placeholder="6 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 20,
            borderRadius: 8,
            border: "1px solid #475569",
          }}
        />

        <button
          onClick={envoyer}
          disabled={chargement}
          style={{
            width: "100%",
            padding: 13,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {chargement
            ? "Chargement..."
            : mode === "connexion"
              ? "Se connecter"
              : "Créer mon compte"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 15,
              padding: 10,
              borderRadius: 8,
              background: "#0f172a",
              color: "#bfdbfe",
            }}
          >
            {message}
          </p>
        )}
{mode === "connexion" && (
  <button
    type="button"
    onClick={async () => {
  if (!email) {
    setMessage("Veuillez saisir votre adresse e-mail.");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    setMessage(error.message);
  } else {
    setMessage("📧 Un e-mail vient d'être envoyé.");
  }
}}
    style={{
      width: "100%",
      marginTop: 12,
      background: "transparent",
      border: "none",
      color: "#60a5fa",
      cursor: "pointer",
      fontSize: 14,
    }}
  >
    Mot de passe oublié ?
  </button>
)}
        <button
          onClick={() => {
            setMode(mode === "connexion" ? "inscription" : "connexion");
            setMessage("");
          }}
          style={{
            width: "100%",
            marginTop: 20,
            background: "transparent",
            border: "none",
            color: "#93c5fd",
            cursor: "pointer",
          }}
        >
          {mode === "connexion"
            ? "Pas encore de compte ? Créer un compte"
            : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </main>
  );
}