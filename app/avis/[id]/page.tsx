"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TourneoRetour from "@/components/TourneoRetour";
import TourneoNav from "@/components/TourneoNav";
export default function Avis() {
    useLangue();
    const { id } = useParams<{
        id: string;
    }>();
    const [user, setUser] = useState(""), [note, setNote] = useState(5), [commentaire, setCommentaire] = useState("");
    const [existe, setExiste] = useState(false), [occupe, setOccupe] = useState(false), [message, setMessage] = useState("");
    useEffect(() => {
        let actif = true;
        void (async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user) {
                window.location.href = "/login";
                return;
            }
            const r = await supabase.from("tourneo_evaluations").select("note,commentaire").eq("tournoi_id", id).eq("user_id", data.user.id).maybeSingle();
            if (!actif)
                return;
            if (r.error) {
                setMessage("Impossible de charger votre évaluation.");
                return;
            }
            setUser(data.user.id);
            if (r.data) {
                setExiste(true);
                setNote(r.data.note);
                setCommentaire(r.data.commentaire);
            }
        })();
        return () => { actif = false; };
    }, [id]);
    async function sauver(e: React.FormEvent) {
        e.preventDefault();
        setOccupe(true);
        setMessage("");
        const r = existe ? await supabase.from("tourneo_evaluations").update({ note, commentaire: commentaire.trim() }).eq("tournoi_id", id).eq("user_id", user) : await supabase.from("tourneo_evaluations").insert({ tournoi_id: id, user_id: user, note, commentaire: commentaire.trim() });
        if (r.error)
            setMessage("Évaluation impossible : le tournoi doit être terminé et vous devez y avoir participé avec votre compte. Actualisez si vous avez déjà donné un avis.");
        else {
            setExiste(true);
            setMessage("Merci, votre avis a été enregistré.");
        }
        setOccupe(false);
    }
    async function retirer() {
        setOccupe(true);
        const r = await supabase.from("tourneo_evaluations").delete().eq("tournoi_id", id).eq("user_id", user);
        if (r.error)
            setMessage("Suppression impossible.");
        else {
            setExiste(false);
            setCommentaire("");
            setMessage("Votre avis a été retiré.");
        }
        setOccupe(false);
    }
    return <main className="v2-page"><div className="v2-shell"><TourneoNav /><section className="v2-card"><h1>{tr("Mon avis sur le tournoi")}</h1><p>{tr("Votre retour aide l\u2019organisateur. Il n\u2019est pas publi\u00E9 sur le lien public.")}</p><form className="v2-form" onSubmit={sauver}><label>{tr("Note")}<select value={note} onChange={e => setNote(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}{tr(" sur 5")}</option>)}</select></label><label>{tr("Commentaire facultatif")}<textarea maxLength={1000} value={commentaire} onChange={e => setCommentaire(e.target.value)}/></label><button disabled={!user || occupe}>{tr("Enregistrer mon avis")}</button></form>{existe && <button disabled={occupe} onClick={() => void retirer()}>{tr("Retirer mon avis")}</button>}<p role="status">{tr(message)}</p><TourneoRetour href="/activite">{tr("Mon activit\u00E9")}</TourneoRetour></section></div></main>;
}
