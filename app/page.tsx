"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  useEffect(() => {
    async function rediriger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      window.location.href = user ? "/dashboard" : "/login";
    }

    rediriger();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Chargement de Tourneo...
    </main>
  );
}
