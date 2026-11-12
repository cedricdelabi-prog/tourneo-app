"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
export default function AccessibiliteCompte() {
  useEffect(() => {
    let actif = true;
    const appliquer = (agrandi = false, reduit = false) => {
      document.documentElement.classList.toggle("tourneo-texte-agrandi", agrandi);
      document.documentElement.classList.toggle("tourneo-animations-reduites", reduit);
    };
    async function charger() {
      const { data } = await supabase.auth.getUser();
      if (!actif) return;
      if (!data.user) { appliquer(); return; }
      const r = await supabase.from("tourneo_preferences").select("texte_agrandi,animations_reduites").eq("user_id", data.user.id).maybeSingle();
      if (actif && !r.error) appliquer(r.data?.texte_agrandi, r.data?.animations_reduites);
    }
    void charger();
    window.addEventListener("tourneo-preferences", charger);
    const { data } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (actif) void charger(); }, 0); });
    return () => { actif = false; window.removeEventListener("tourneo-preferences", charger); data.subscription.unsubscribe(); appliquer(); };
  }, []);
  return null;
}
