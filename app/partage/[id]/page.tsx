"use client";
import {LienPronostics} from '@/components/PronosticsPublic';
import {LienAlbumPublic} from '@/components/AlbumPublic';
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { nomParticipant } from "@/lib/rotation";
import { classementTournoi, tournoiEstTermine } from "@/lib/resultats";
import { normaliserOptionsV2, type OptionsV2 } from "@/lib/options-v2";
import { scoreValide } from "@/lib/formats-avances";
import { passagesJoueur, notifierPassage } from "@/lib/suivi-matchs";
import { heureCreneau, planifierMatchs } from "@/lib/planning";
import type { Equipe as EquipeMoteur, Match as MatchMoteur } from "@/types";
import SelecteurLangue from '@/components/SelecteurLangue';
import TourneoBrand from "@/components/TourneoBrand";
type Equipe = {
    id?: string;
    userId?: string;
    profilId?: string;
    nom?: string;
    nomEquipe?: string;
    emoji?: string;
    photo?: string;
    couleur?: string;
};
type Match = {
    terrain?: number;
    ordre?: number;
    joueurs1Ids?: string[];
    joueurs2Ids?: string[];
    branche?: MatchMoteur["branche"];
    id?: number | string;
    journee?: number;
    equipe1Id?: string;
    equipe2Id?: string;
    score1?: string | number | null;
    score2?: string | number | null;
};
type PodiumFinal = {
    rang: number;
    nom: string;
    points?: number;
    photo?: string;
    couleur?: string;
};
type DonneesTournoi = {
    equipes?: Equipe[];
    matchs?: Match[];
    formatTournoi?: string;
    optionsV2?: OptionsV2;
    matchsValides?: number[];
    podiumPhotoUrl?: string;
    podiumFinal?: PodiumFinal[];
    termine?: boolean;
};
type Tournoi = {
    id: string;
    nom: string;
    sport?: string;
    donnees?: DonneesTournoi | string | null;
};
function scoreRenseigne(score: Match["score1"]) {
    return scoreValide(score);
}
function normaliserDonnees(donnees: Tournoi["donnees"]): DonneesTournoi {
    if (!donnees)
        return {};
    if (typeof donnees === "string") {
        try {
            return JSON.parse(donnees) as DonneesTournoi;
        }
        catch {
            return {};
        }
    }
    return donnees;
}
export default function PartagePage() {
    useLangue();
    const params = useParams<{
        id: string;
    }>();
    const tournoiId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [ecranGeant, setEcranGeant] = useState(false);
    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [erreur, setErreur] = useState("");
    const [chargement, setChargement] = useState(true);
    const [onglet, setOnglet] = useState<"matchs" | "classement" | "participants">("matchs");
    const [monEquipeId, setMonEquipeId] = useState("");
    const [permissionEnCours, setPermissionEnCours] = useState(false);
    const demandePermission = useRef(false);
    const ancreOuverte = useRef("");
    const [suivi, setSuivi] = useState(false);
    const [message, setMessage] = useState("");
    const [podiumAnime, setPodiumAnime] = useState(false);
    const derniereNotif = useRef("");
    useEffect(() => {
        if (!tournoiId)
            return;
        setMonEquipeId("");
        setSuivi(false);
        setMessage("");
        derniereNotif.current = "";
        try {
            const choix = JSON.parse(localStorage.getItem(`tourneo-suivi-v2:${tournoiId}`) || "null");
            if (choix && typeof choix.participant === "string") {
                setMonEquipeId(choix.participant);
                setSuivi(choix.actif === true);
            }
        }
        catch { /* The public tournament still works without local storage. */ }
    }, [tournoiId]);
    useEffect(() => {
        if (!tournoiId) {
            setErreur("Lien de tournoi invalide.");
            setChargement(false);
            return;
        }
        let actif = true;
        let minuterie: ReturnType<typeof setTimeout>;
        let enCours = false;
        async function charger() {
            if (!actif || enCours)
                return;
            enCours = true;
            try {
                let resultat = await supabase.rpc("tourneo_public_v2", { p_id: tournoiId });
                if (resultat.error && /PGRST202|schema cache|could not find/i.test(resultat.error.code + " " + resultat.error.message))
                    resultat = await supabase.rpc("get_tourneo_public", { p_id: tournoiId });
                if (!actif)
                    return;
                const ligne = Array.isArray(resultat.data) ? resultat.data[0] : resultat.data;
                if (resultat.error || !ligne)
                    throw new Error("Tournoi introuvable ou partage public indisponible.");
                setTournoi({ ...ligne, donnees: normaliserDonnees(ligne.donnees) });
                setErreur("");
            }
            catch {
                if (actif)
                    setErreur("Actualisation indisponible. Les dernières données reçues restent affichées. Vérifiez votre connexion.");
            }
            finally {
                enCours = false;
                if (actif) {
                    setChargement(false);
                    minuterie = setTimeout(() => void charger(), 4000);
                }
            }
        }
        const reconnecter = () => { clearTimeout(minuterie); void charger(); };
        setTournoi(null);
        setChargement(true);
        setErreur("");
        void charger();
        window.addEventListener("online", reconnecter);
        return () => { actif = false; clearTimeout(minuterie); window.removeEventListener("online", reconnecter); };
    }, [tournoiId]);
    const donnees = normaliserDonnees(tournoi?.donnees);
    const equipes = donnees.equipes ?? [];
    const matchs = donnees.matchs ?? [];
    function enregistrerSuivi(participant: string, actif: boolean) {
        setMonEquipeId(participant);
        setSuivi(actif);
        derniereNotif.current = "";
        try {
            localStorage.setItem(`tourneo-suivi-v2:${tournoiId}`, JSON.stringify({ participant, actif }));
        }
        catch { }
    }
    async function activerSuivi() {
        if (demandePermission.current || !monEquipeId)
            return;
        if (suivi) {
            enregistrerSuivi(monEquipeId, false);
            setMessage("Alertes arrêtées sur cet appareil.");
            return;
        }
        demandePermission.current = true;
        setPermissionEnCours(true);
        try {
            const permission = "Notification" in window ? await Notification.requestPermission() : "denied";
            try {
                sessionStorage.removeItem(`tourneo-derniere-alerte:${tournoiId}:${monEquipeId}`);
            }
            catch { }
            enregistrerSuivi(monEquipeId, true);
            setMessage(permission === "granted" ? "Alertes locales activées. Gardez cette page ouverte ; aucun envoi lorsque l’application est fermée." : "Le suivi visuel reste actif. Les notifications système sont indisponibles ou refusées sur cet appareil.");
        }
        catch {
            setMessage("Impossible d’activer les notifications. Le suivi visuel reste disponible.");
        }
        finally {
            demandePermission.current = false;
            setPermissionEnCours(false);
        }
    }
    const options = normaliserOptionsV2(donnees.optionsV2);
    const equipesMoteur: EquipeMoteur[] = equipes.filter(e => e.id).map(e => ({ id: e.id!, nom: e.nomEquipe || e.nom || "Participant", emoji: e.emoji || "", couleur: e.couleur || "", photo: e.photo, profilId: e.profilId }));
    const matchsMoteur: MatchMoteur[] = matchs.map(m => ({ id: Number(m.id), journee: m.journee ?? 1, equipe1Id: m.equipe1Id || "", equipe2Id: m.equipe2Id || "", score1: m.score1 == null ? "" : String(m.score1), score2: m.score2 == null ? "" : String(m.score2), branche: m.branche, ordre: m.ordre, terrain: typeof m.terrain === "number" ? m.terrain : undefined, joueurs1Ids: m.joueurs1Ids, joueurs2Ids: m.joueurs2Ids }));
    const planningPublic = new Map(planifierMatchs(matchsMoteur, options).map(c => [c.matchId, c]));
    const formatParcours = donnees.formatTournoi === "doubleElimination" || donnees.formatTournoi === "consolante" ? donnees.formatTournoi : null;
    const classement = classementTournoi(donnees.formatTournoi || "complet", equipesMoteur, matchsMoteur, options).map(l => ({ ...l, id: l.equipe.id, nom: l.equipe.nom }));
    const tournoiTermine = tournoiEstTermine(donnees.formatTournoi || "complet", equipesMoteur, matchsMoteur, options, donnees.matchsValides);
    const passages = passagesJoueur(monEquipeId, matchsMoteur, options, donnees.matchsValides);
    const prochain = passages.find(p => p.statut !== "validation");
    const clePassage = prochain?.statut === "prochain" ? `${tournoiId}:${monEquipeId}:${prochain.match.id}` : "";
    const prochainId = prochain?.match.id;
    const textePassage = prochain ? `${nomParticipant(prochain.match.equipe1Id, equipesMoteur)} / ${nomParticipant(prochain.match.equipe2Id, equipesMoteur)} · terrain ${prochain.creneau.terrain}. Vérifiez l’appel de l’organisateur.` : "";
    useEffect(() => {
        if (!suivi || !clePassage || prochainId === undefined || derniereNotif.current === clePassage)
            return;
        derniereNotif.current = clePassage;
        try {
            const cle = `tourneo-derniere-alerte:${tournoiId}:${monEquipeId}`;
            if (sessionStorage.getItem(cle) === clePassage)
                return;
            sessionStorage.setItem(cle, clePassage);
        }
        catch { }
        setMessage(`Prochain match : ${textePassage}`);
        void notifierPassage(tournoiId, prochainId, textePassage);
    }, [suivi, clePassage, prochainId, textePassage, tournoiId, monEquipeId]);
    useEffect(() => {
        if (!tournoi || ancreOuverte.current === tournoiId)
            return;
        const ancre = window.location.hash.slice(1);
        if (!/^match-\d+$/.test(ancre))
            return;
        ancreOuverte.current = tournoiId;
        setOnglet("matchs");
        requestAnimationFrame(() => document.getElementById(ancre)?.scrollIntoView({ block: "center" }));
    }, [tournoi, tournoiId]);
    const podiumFinal: PodiumFinal[] = donnees.podiumFinal?.length
        ? donnees.podiumFinal
        : classement.slice(0, 3).map((ligne, index) => ({
            rang: index + 1,
            nom: ligne.nom,
            points: ligne.pts,
            photo: equipes.find((e) => e.id === ligne.id)?.photo,
            couleur: equipes.find((e) => e.id === ligne.id)?.couleur,
        }));
    function exporterClassementCSV() {
        const cellules = [["Rang", "Participant", "Matchs joués", "Victoires", "Nuls", "Défaites", "Différence", "Points"],
            ...classement.map((ligne, index) => [
                String(index + 1), ligne.nom, String(ligne.mj), String(ligne.v),
                String(ligne.n), String(ligne.d), String(ligne.diff), String(ligne.pts),
            ])];
        const csv = "\uFEFF" + cellules.map((ligne) => ligne.map((valeur) => '"' + (/^[\s]*[=+@-]/.test(valeur) ? "'" + valeur : valeur).replace(/"/g, '""') + '"').join(";")).join("\r\n");
        const fichier = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(fichier);
        const lien = document.createElement("a");
        lien.href = url;
        lien.download = "tourneo-classement-" + (tournoi?.nom || "tournoi").replace(/[^a-z0-9-]/gi, "_") + ".csv";
        document.body.appendChild(lien);
        lien.click();
        lien.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const matchsTries = useMemo(() => [...matchs].sort((a, b) => (a.journee ?? Number.MAX_SAFE_INTEGER) -
        (b.journee ?? Number.MAX_SAFE_INTEGER)), [matchs]);
    if (erreur && !tournoi) {
        return (<main className={ecranGeant ? "tourneo-ecran-geant" : undefined} style={s.page}><div className="tourneo-visitor-language"><SelecteurLangue/></div>
        <div style={s.shell}>
          <TourneoBrand />
          <section style={s.errorCard}>
            <strong>{tr("Impossible d\u2019ouvrir ce tournoi")}</strong>
            <p style={s.muted}>{tr(erreur)}</p>
            <button style={s.retry} onClick={() => window.location.reload()}>{tr("R\u00E9essayer")}</button>
          </section>
        </div>
      </main>);
    }
    if (chargement || !tournoi) {
        return (<main className={ecranGeant ? "tourneo-ecran-geant" : undefined} style={s.page}><div className="tourneo-visitor-language"><SelecteurLangue/></div>
        <div style={s.shell}>
          <TourneoBrand />
          <p style={s.muted}>{tr("Chargement du tournoi\u2026")}</p>
        </div>
      </main>);
    }
    return (<main className={ecranGeant ? "tourneo-ecran-geant" : undefined} style={s.page}><div className="tourneo-visitor-language"><SelecteurLangue/></div>
      <div style={s.shell}>
        <header style={s.header}>
          <TourneoBrand compact/>
          <span style={s.readonly}>{tournoiTermine ? tr("TERMINÉ · souvenir") : tr("LIVE · lecture seule")}</span>
        </header>

        <section style={s.hero}>
          <span style={s.eyebrow}>{tournoiTermine ? tr("Tournoi terminé") : tr("Tournoi en direct")}</span>
          <h1 style={s.title}>{tournoi.nom}</h1>
          <p style={s.muted}>
            {tournoi.sport || tr("Multisport")} · {tournoiTermine ? tr("Résultats définitifs") : tr("Actualisation automatique")}
          </p>

          <div style={{ marginTop: 18, display: "grid", gap: 8, maxWidth: 560 }}>
            <label htmlFor="tourneo-joueur-suivi">{tr("Voir les prochains matchs d\u2019un participant")}</label>
            <select id="tourneo-joueur-suivi" value={monEquipeId} disabled={permissionEnCours} style={{ padding: 12, color: "white", background: "#101c32", border: "1px solid #475579", borderRadius: 12 }} onChange={e => { enregistrerSuivi(e.target.value, false); setMessage(""); }}>
              <option value="">{tr("Choisir un pseudo\u2026")}</option>
              {equipes.filter(e => e.id).map((e, i) => <option key={e.id} value={e.id}>{e.nomEquipe || e.nom || tr("Participant")} · #{i + 1}</option>)}
            </select>
            <small style={s.muted}>{tr("Choix sur cet appareil uniquement. Aucun acc\u00E8s \u00E0 la modification des scores.")}</small>
            {monEquipeId && <button type="button" style={s.follow} disabled={permissionEnCours} onClick={() => void activerSuivi()}>{permissionEnCours ? tr("Activation…") : suivi ? tr("Arrêter les alertes locales") : tr("Activer les alertes locales")}</button>}
            {monEquipeId && <div aria-live="polite">
              {passages.slice(0, 3).map(p => <p key={p.match.id} style={{ lineHeight: 1.6 }}><a href={`#match-${p.match.id}`} onClick={() => setOnglet("matchs")} style={{ color: "#8deaff" }}>{tr("Match ")}{p.match.id}</a> · {nomParticipant(p.match.equipe1Id, equipesMoteur)} / {nomParticipant(p.match.equipe2Id, equipesMoteur)}{tr(" \u00B7 terrain ")}{p.creneau.terrain} · {heureCreneau(p.creneau.debut, options.depart)}{tr(" (estim\u00E9)")}<br /><small>{p.statut === "validation" ? tr("Score saisi · validation organisateur en attente") : p.avant ? trModele("{0} rencontre(s) \u00E0 terminer avant ce passage", p.avant) : tr("Prochain passage prévu · attendre l’appel de l’organisateur")}</small></p>)}
              {!passages.length && <p>{tr("Aucun passage pr\u00E9vu pour ce participant dans les rencontres actuellement g\u00E9n\u00E9r\u00E9es.")}</p>}
            </div>}
          </div>
          {tr(erreur) && <p role="status" style={s.message}>{tr(erreur)}</p>}
          {tr(message) && <p style={s.message}>{tr(message)}</p>}
        </section>



        {tournoiTermine && podiumFinal.length > 0 && (<section style={s.finalPoster}>
            <div style={s.finalPosterTop}>
              <div>
                <span style={s.eyebrow}>{tr("Affiche souvenir")}</span>
                <h2 style={s.finalTitle}>{tr("Podium final")}</h2>
                <p style={s.muted}>{tr("Ce lien reste disponible apr\u00E8s la fin du tournoi.")}</p>
                <button type="button" style={s.follow} onClick={() => setPodiumAnime(true)}>{tr("\uD83C\uDFC6 C\u00E9l\u00E9brer le podium")}</button>
                <button type="button" style={{ ...s.follow, marginLeft: 8 }} onClick={() => window.print()}>{tr("Imprimer les r\u00E9sultats")}</button>
              </div>
            </div>

            {donnees.podiumPhotoUrl && (<img src={donnees.podiumPhotoUrl} alt={tr("Photo du podium")} style={s.finalPhoto} referrerPolicy="no-referrer"/>)}

            {podiumAnime && <div role="status" aria-live="polite" style={{ textAlign: "center", fontSize: "clamp(26px,6vw,55px)", padding: 12, animation: "tourneo-celebrate 1.1s ease-out" }}>🎉 🏆 🎊 🎉 🥇 🎊</div>}
            <div style={s.finalPodium}>
              {[podiumFinal[1], podiumFinal[0], podiumFinal[2]].filter(Boolean).map((p) => (<article key={`${p.rang}-${p.nom}`} style={{ ...s.finalPodiumCard, ...(p.rang === 1 ? s.finalWinner : {}) }}>
                  {p.photo ? (<img src={p.photo} alt="" style={s.finalAvatar} referrerPolicy="no-referrer"/>) : (<div style={{ ...s.finalAvatarFallback, background: p.couleur || "#3B82F6" }}>
                      {p.nom.slice(0, 1).toUpperCase()}
                    </div>)}
                  <span style={s.finalMedal}>{p.rang === 1 ? "🥇" : p.rang === 2 ? "🥈" : "🥉"}</span>
                  <strong>{p.nom}</strong>
                  <small style={s.muted}>{p.points !== undefined ? trModele("{0} pts", p.points) : trModele("{0}e place", p.rang)}</small>
                </article>))}
            </div>
          </section>)}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          <button type="button" style={s.follow} onClick={async () => {
            const url = window.location.href;
            try {
                if (navigator.share)
                    await navigator.share({ title: tournoi.nom, url });
                else {
                    await navigator.clipboard.writeText(url);
                    setMessage("Lien du tournoi copié.");
                }
            }
            catch (error) {
                if (error instanceof Error && error.name !== "AbortError")
                    setMessage("Partage indisponible sur cet appareil.");
            }
        }}>{tr("Partager le tournoi")}</button>
          <button type="button" style={s.follow} onClick={() => window.print()}>{tr("Imprimer / PDF")}</button>
          <button type="button" style={s.follow} onClick={exporterClassementCSV} disabled={classement.length === 0}>{tr("Exporter classement CSV")}</button>
          <button type="button" style={s.follow} onClick={async () => {
            if (ecranGeant) {
                setEcranGeant(false);
                if (document.fullscreenElement)
                    await document.exitFullscreen().catch(() => { });
            }
            else {
                setEcranGeant(true);
                await document.documentElement.requestFullscreen?.().catch(() => { });
            }
        }}>{ecranGeant ? tr("Quitter l’écran géant") : tr("Écran géant")}</button>
        </div>
        <style jsx global>{`article[id^="match-"]:target { outline: 3px solid #72e7ff; } @keyframes tourneo-celebrate { from { opacity:0; transform:translateY(20px) scale(.8) } to { opacity:1; transform:translateY(0) scale(1) } } @media print { button, footer {display:none !important} body {background:white !important;color:black !important} main {background:white !important;color:black !important} }`}</style>
        <div style={s.tabs}>
          <button style={onglet === "matchs" ? s.tabActive : s.tab} onClick={() => setOnglet("matchs")}>{tr("Matchs")}</button>
          <button style={onglet === "classement" ? s.tabActive : s.tab} onClick={() => setOnglet("classement")}>{tr("Classement")}</button>
          <button style={onglet === "participants" ? s.tabActive : s.tab} onClick={() => setOnglet("participants")}>{tr("Participants")}</button>
        </div>

        <LienPronostics id={tournoiId}/><LienAlbumPublic id={tournoiId}/>
        {onglet === "matchs" && (<section style={s.list}>
            {matchsTries.length === 0 ? (<p style={s.empty}>{tr("Aucun match n\u2019est encore disponible.")}</p>) : (matchsTries.map((m, i) => (<article id={`match-${m.id ?? i}`} key={String(m.id ?? i)} style={{ ...s.match, scrollMarginTop: 24 }}>
                  <div style={s.teamBlock}>
                    <span style={s.teamName}>
                      {nomParticipant(m.equipe1Id || "", equipesMoteur)}
                    </span>
                  </div>

                  <div style={s.scoreBlock}>
                    {m.journee ? (<small style={s.day}>J{m.journee}{tr(" \u00B7 Terrain ")}{planningPublic.get(Number(m.id))?.terrain || "—"}</small>) : null}
                    {planningPublic.has(Number(m.id)) && <small style={s.muted}>{heureCreneau(planningPublic.get(Number(m.id))!.debut, options.depart)}{tr(" (estim\u00E9)")}</small>}
                    <strong style={s.score}>
                      {scoreRenseigne(m.score1) ? m.score1 : "–"} :{" "}
                      {scoreRenseigne(m.score2) ? m.score2 : "–"}
                    </strong>
                  </div>

                  <div style={s.teamBlock}>
                    <span style={s.teamName}>
                      {nomParticipant(m.equipe2Id || "", equipesMoteur)}
                    </span>
                  </div>
                </article>)))}
          </section>)}

        {onglet === "classement" && (<section style={s.list}>
            {classement.length === 0 ? (<p style={s.empty}>{tr("Le classement appara\u00EEtra ici.")}</p>) : (classement.map((l, i) => (<article key={l.id} style={s.rank}>
                  <strong style={s.position}>{i + 1}</strong>
                  <span>{l.nom}</span>
                  <div style={s.rankStats}>
                    <small>
                      {l.mj}{tr(" MJ \u00B7 diff ")}{l.diff > 0 ? "+" : ""}
                      {l.diff}
                    </small>
                    <b>{l.pts}{tr(" pts")}</b>
                  </div>
                </article>)))}
          </section>)}

        {onglet === "participants" && (<section style={s.grid}>
            {equipes.length === 0 ? (<p style={s.empty}>{tr("Aucun participant n\u2019est encore inscrit.")}</p>) : (equipes.map((e, i) => (<article key={e.id ?? String(i)} style={s.player}>
                  {e.photo ? (<img src={e.photo} alt="" style={s.avatar} referrerPolicy="no-referrer"/>) : (<div style={{
                        ...s.avatarFallback,
                        background: e.couleur || "#3B82F6",
                    }}>
                      {e.emoji || "•"}
                    </div>)}
                  <strong>
                    {e.nomEquipe || e.nom || trModele("Participant {0}", i + 1)}
                  </strong>
                </article>)))}
          </section>)}

        <footer style={s.footer}>{tr("Ce lien est public : aucune connexion n\u2019est n\u00E9cessaire pour suivre le tournoi.")}</footer>
      </div>
    </main>);
}
const s: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "20px 16px 70px",
        background: "radial-gradient(circle at 15% 5%,rgba(124,92,255,.17),transparent 28%),linear-gradient(145deg,#050811,#0B1220)",
        color: "white",
        fontFamily: "Inter,system-ui,sans-serif",
    },
    shell: { maxWidth: 980, margin: "0 auto" },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 18,
    },
    readonly: {
        padding: "7px 10px",
        borderRadius: 999,
        background: "rgba(34,211,238,.07)",
        color: "#8DEBFF",
        fontSize: 10,
        fontWeight: 900,
    },
    hero: { padding: "22px 0" },
    eyebrow: {
        color: "#72E7FF",
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: "uppercase",
    },
    title: {
        margin: "7px 0",
        fontSize: "clamp(38px,8vw,70px)",
        lineHeight: 1,
    },
    muted: { color: "#8598AF" },
    follow: {
        marginTop: 12,
        padding: "11px 14px",
        borderRadius: 13,
        border: "1px solid rgba(114,231,255,.22)",
        background: "rgba(114,231,255,.07)",
        color: "#D4FAFF",
        fontWeight: 900,
        cursor: "pointer",
    },
    message: { color: "#A7EFFF", fontSize: 12 },
    tabs: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 6,
        padding: 6,
        borderRadius: 18,
        background: "#07101E",
        margin: "16px 0",
    },
    tab: {
        padding: 11,
        border: 0,
        borderRadius: 13,
        background: "transparent",
        color: "#8193AA",
        fontWeight: 900,
        cursor: "pointer",
    },
    tabActive: {
        padding: 11,
        border: 0,
        borderRadius: 13,
        background: "linear-gradient(135deg,rgba(124,92,255,.25),rgba(34,211,238,.11))",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
    },
    list: { display: "grid", gap: 9 },
    match: {
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 10,
        alignItems: "center",
        padding: 15,
        borderRadius: 17,
        background: "rgba(15,25,43,.78)",
        border: "1px solid rgba(148,163,184,.12)",
        textAlign: "center",
    },
    teamBlock: {
        minWidth: 0,
        display: "flex",
        justifyContent: "center",
    },
    teamName: {
        overflowWrap: "anywhere",
        fontWeight: 800,
    },
    scoreBlock: {
        minWidth: 66,
        display: "grid",
        gap: 3,
        justifyItems: "center",
    },
    score: { fontSize: 18, whiteSpace: "nowrap" },
    day: { color: "#72E7FF", fontWeight: 900 },
    rank: {
        display: "grid",
        gridTemplateColumns: "40px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,25,43,.78)",
        border: "1px solid rgba(148,163,184,.12)",
    },
    position: {
        width: 32,
        height: 32,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        background: "rgba(124,92,255,.15)",
    },
    rankStats: {
        display: "grid",
        justifyItems: "end",
        gap: 2,
        color: "#DDE7F4",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
        gap: 10,
    },
    player: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,25,43,.78)",
        border: "1px solid rgba(148,163,184,.12)",
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 13,
        objectFit: "cover",
    },
    avatarFallback: {
        width: 42,
        height: 42,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
    },
    empty: {
        margin: 0,
        padding: 18,
        borderRadius: 16,
        background: "rgba(15,25,43,.55)",
        color: "#8598AF",
        textAlign: "center",
    },
    errorCard: {
        marginTop: 24,
        padding: 20,
        borderRadius: 18,
        background: "rgba(15,25,43,.78)",
        border: "1px solid rgba(248,113,113,.22)",
    },
    retry: {
        padding: "10px 13px",
        borderRadius: 12,
        border: 0,
        background: "white",
        color: "#09111F",
        fontWeight: 900,
        cursor: "pointer",
    },
    finalPoster: {
        padding: 20,
        borderRadius: 22,
        margin: "8px 0 18px",
        background: "radial-gradient(circle at 18% 0%,rgba(124,92,255,.24),transparent 34%),linear-gradient(145deg,#0B1627,#101C32)",
        border: "1px solid rgba(114,231,255,.18)",
    },
    finalPosterTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
    finalTitle: { margin: "5px 0 4px", fontSize: 30, letterSpacing: "-.03em" },
    finalPhoto: { width: "100%", maxHeight: 460, objectFit: "cover", borderRadius: 18, marginTop: 16, display: "block" },
    finalPodium: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, alignItems: "end", marginTop: 18 },
    finalPodiumCard: { minWidth: 0, minHeight: 150, display: "grid", justifyItems: "center", alignContent: "center", gap: 7, padding: "14px 7px", borderRadius: 17, background: "rgba(255,255,255,.04)", border: "1px solid rgba(148,163,184,.12)", textAlign: "center", overflowWrap: "anywhere" },
    finalWinner: { minHeight: 180, background: "radial-gradient(circle at 50% 0%,rgba(250,204,21,.13),transparent 55%),rgba(124,92,255,.10)", border: "1px solid rgba(250,204,21,.25)" },
    finalAvatar: { width: 52, height: 52, borderRadius: 16, objectFit: "cover" },
    finalAvatarFallback: { width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", fontWeight: 950 },
    finalMedal: { fontSize: 24 },
    footer: {
        marginTop: 26,
        color: "#60748D",
        fontSize: 11,
        textAlign: "center",
    },
};
