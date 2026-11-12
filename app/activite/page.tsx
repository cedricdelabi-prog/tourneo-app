"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TourneoNav from "@/components/TourneoNav";
type Notification = { id: string; tournoi_id: string | null; type: string; message: string; lu: boolean; created_at: string };
type Resultat = { tournament_id: string; tournament_name: string };
export default function Activite() {
  const [notifications, setNotifications] = useState<Notification[]>([]), [resultats, setResultats] = useState<Resultat[]>([]);
  const [message, setMessage] = useState(""), [occupe, setOccupe] = useState(false);
  const charger = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { window.location.href = "/login"; return; }
    const [n, r] = await Promise.all([supabase.from("tourneo_notifications").select("id,tournoi_id,type,message,lu,created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }).limit(100), supabase.from("player_results").select("tournament_id,tournament_name").eq("profile_id", data.user.id).order("created_at", { ascending: false }).limit(100)]);
    if (n.error || r.error) setMessage("Chargement impossible. Vérifiez votre connexion puis actualisez.");
    else { setNotifications(n.data || []); setResultats(r.data || []); setMessage(""); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);
  async function marquer(id: string) {
    setOccupe(true);
    const r = await supabase.from("tourneo_notifications").update({ lu: true }).eq("id", id);
    if (r.error) setMessage("Cette notification n’a pas pu être mise à jour.");
    else setNotifications(a => a.map(n => n.id === id ? { ...n, lu: true } : n));
    setOccupe(false);
  }
  return <main className="v2-page"><div className="v2-shell"><TourneoNav/><section className="v2-card"><h1>Mon activité</h1><p>Inscriptions, arbitrages et résultats à valider. Les 100 notifications les plus récentes sont affichées.</p><button onClick={() => void charger()}>Actualiser</button>{message && <p role="alert">{message}</p>}{!notifications.length && <p>Aucune notification pour le moment.</p>}{notifications.map(n => <article className="v2-entry" key={n.id}><p>{!n.lu && <strong>Nouveau · </strong>}{n.message}</p><small>{new Date(n.created_at).toLocaleString("fr-FR")}</small><div className="v2-row">{n.tournoi_id && <a href={n.type === 'arbitrage' ? '/arbitrage' : n.type === 'statut_inscription' ? `/inscriptions/${n.tournoi_id}` : `/tournoi/${n.tournoi_id}`}>Consulter</a>}{!n.lu && <button disabled={occupe} onClick={() => void marquer(n.id)}>Marquer comme lu</button>}</div></article>)}</section><section className="v2-card"><h2>Mon avis après un tournoi</h2><p>Votre évaluation est visible par l’organisateur et par vous. Une seule évaluation par personne et par tournoi.</p>{resultats.map(r => <p key={r.tournament_id}><a href={`/avis/${r.tournament_id}`}>{r.tournament_name} · Donner mon avis</a></p>)}{!resultats.length && <p>Vos tournois terminés avec un profil Tourneo apparaîtront ici.</p>}</section></div></main>;
}
