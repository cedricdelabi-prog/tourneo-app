"use client";
import {urlPubliqueTournoi} from '@/lib/url-publique';
import ReglesSport from '@/components/ReglesSport';
import ChoixSport from '@/components/ChoixSport';
import {libellesSports as LIBELLES_SPORT} from '@/lib/catalogue-sports';
import AlbumTournoi from '@/components/AlbumTournoi';
import {deconnecterTourneo} from "@/lib/push-client";
import {tr,trModele,useLangue,localeFormat} from "@/lib/langue";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import PhotoPrivee from "@/components/PhotoPrivee";
import { referencePhoto, urlPhotoPrivee } from "@/lib/media-prive";
import TeamAvatar from "@/components/TeamAvatar";
import TeamCard from "@/components/TeamCard";
import TeamModal from "@/components/TeamModal";
import { calculerClassement, genererMatchs, genererMatchsAllerRetour, genererMatchsElimination, } from "@/lib/tournoi";
import { prochainTourParcours, classementParcours, parcoursTermine } from "@/lib/parcours";
import { lireFichierParticipants, nomsAAjouter } from "@/lib/import-participants";
import { classementTournoi, tournoiEstTermine } from "@/lib/resultats";
import { genererPartenairesTournants, nomParticipant } from "@/lib/rotation";
import { lireSauvegarde, telechargerSauvegarde } from "@/lib/sauvegarde";
import { reglesPourSport, erreurScoreSport } from "@/lib/sports";
import { repartirPoules, ordreElimination } from "@/lib/tirages";
import ArbitresTournoi from "@/components/ArbitresTournoi";
import TourneoRetour from "@/components/TourneoRetour";
import RepereParticipant from "@/components/RepereParticipant";
import PlanningTournoi from "@/components/PlanningTournoi";
import OptionsTournoiV2 from "@/components/OptionsTournoiV2";
import SaisieManches from "@/components/SaisieManches";
import { OPTIONS_V2, normaliserOptionsV2, type OptionsV2 } from "@/lib/options-v2";
import { classementCSV, prochaineRondeSuisse, resultatSerie } from "@/lib/formats-avances";
import type { Equipe, Match } from "@/types";
import { supabase } from "@/lib/supabase";
import { modifierEquipeEnCours } from "@/lib/modification-equipe";
import { nomsPourTirage, type EquipeTiree } from "@/lib/outils-arbitre";
import { synchroniserTournoi, lireRevision, type VersionTournoi } from "@/lib/synchronisation";
import TourneoBrand from "@/components/TourneoBrand";
import TourneoNav from "@/components/TourneoNav";
const CLE = "tourneo-v04";
const SEUIL_PHASE_FINALE = 100000;
type FormatTournoi = "rotation" | "suisse" | "doubleElimination" | "consolante" | "allerRetour" | "complet" | "poules" | "elimination" | "poulesFinale";
type ModePoules = "nombrePoules" | "taillePoules";
type Onglet = "matchs" | "classement" | "statistiques" | "participants" | "arbitrage" | "photos";
type Poule = {
    id: string;
    nom: string;
    terrain: string;
    equipes: Equipe[];
};
const LIBELLES_FORMAT: Record<FormatTournoi, string> = {
    complet: "Championnat complet",
    allerRetour: "Championnat aller-retour",
    rotation: "Partenaires tournants (doubles)",
    suisse: "Système suisse",
    doubleElimination: "Double élimination",
    consolante: "Élimination avec consolante",
    poules: "Phase de poules",
    elimination: "Élimination directe",
    poulesFinale: "Poules puis phase finale",
};
const EXPLICATIONS_FORMAT: Record<FormatTournoi, string> = {
    complet: "Tout le monde rencontre tout le monde. Classement général aux points.",
    rotation: "Les partenaires changent à chaque ronde. Chaque joueur conserve ses points individuels. Les joueurs au repos tournent aussi.",
    suisse: "Appariements à chaque ronde selon les résultats précédents. Les exemptions tournent et rapportent les points d’une victoire.",
    doubleElimination: "Deux défaites éliminent. Un finaliste invaincu conserve son droit à une seconde chance en finale.",
    consolante: "Les perdants du premier tour jouent un tableau séparé jusqu’à la finale de consolante.",
    allerRetour: "Chaque adversaire est rencontré deux fois, à domicile puis à l’extérieur. Classement général aux points.",
    poules: "Les participants sont répartis en groupes avec un classement par poule.",
    elimination: "Une défaite élimine. Les vainqueurs avancent jusqu’à la finale.",
    poulesFinale: "Phase de poules puis qualification automatique vers une phase finale.",
};
function capitaliserNom(valeur: string) {
    return valeur.replace(/(^|\s|[-’'])\p{L}/gu, (lettre) => lettre.toUpperCase());
}
function pointsPourRang(rang: number) {
    if (rang === 1)
        return 100;
    if (rang === 2)
        return 70;
    if (rang <= 4)
        return 50;
    if (rang <= 8)
        return 30;
    return 10;
}
function estPuissanceDeDeux(nombre: number) {
    return nombre >= 2 && (nombre & (nombre - 1)) === 0;
}
function melanger<T>(elements: T[]) {
    const copie = [...elements];
    for (let i = copie.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
}
function nomTourDepuisNombreMatchs(nombreMatchs: number) {
    if (nombreMatchs === 1)
        return "Finale";
    if (nombreMatchs === 2)
        return "Demi-finales";
    if (nombreMatchs === 4)
        return "Quarts de finale";
    if (nombreMatchs === 8)
        return "Huitièmes de finale";
    if (nombreMatchs === 16)
        return "Seizièmes de finale";
    if (nombreMatchs === 32)
        return "Trente-deuxièmes de finale";
    return "Phase finale";
}
function LogoTourneo({ compact = false }: {
    compact?: boolean;
}) {
    useLangue();
    return <TourneoBrand compact={compact}/>;
}
export default function TournoiPage() {
    useLangue();
    const params = useParams<{
        id: string;
    }>();
    const [importEnCours, setImportEnCours] = useState(false);
    const [nomsImportes, setNomsImportes] = useState<string[]>([]);
    const [messageImport, setMessageImport] = useState("");
    const verrouImport = useRef(false);
    const generationImport = useRef(0);
    useEffect(() => {
        generationImport.current++;
        verrouImport.current = false;
        setNomsImportes([]);
        setImportEnCours(false);
        setMessageImport("");
        return () => { generationImport.current++; };
    }, [params.id]);
    const [revisionConnexion, setRevisionConnexion] = useState(0);
    const fileSynchronisation = useRef<Promise<void>>(Promise.resolve());
    const generationSync = useRef(0);
    const revisionCloud = useRef<number | null>(null);
    const premiereSauvegarde = useRef(true);
    const derniereSignature = useRef('');
    const suspendreSync = useRef(false);
    const [conflitCloud, setConflitCloud] = useState<VersionTournoi | null>(null);
    useEffect(() => {
        const reconnecter = () => {
            setRevisionConnexion((revision) => revision + 1);
            void supabase.auth.getSession().then(({ data }) => { if (data.session?.user)
                setUserId(data.session.user.id); });
        };
        window.addEventListener("online", reconnecter);
        return () => window.removeEventListener("online", reconnecter);
    }, []);
    const [nomTournoi, setNomTournoi] = useState("");
    const [sport, setSport] = useState("multisport");
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [matchs, setMatchs] = useState<Match[]>([]);
    const [cree, setCree] = useState(false);
    const [pret, setPret] = useState(false);
    const [modalOuvert, setModalOuvert] = useState(false);
    const [equipeAModifier, setEquipeAModifier] = useState<Equipe | null>(null);
    const [onglet, setOnglet] = useState<Onglet>("matchs");
    const [lienPartage, setLienPartage] = useState("");
    const [qrOuvert, setQrOuvert] = useState(false);
    const [userId, setUserId] = useState("");
    const [tournoiId, setTournoiId] = useState("");
    const cacheKey = `${CLE}:${tournoiId || params.id}`;
    const pendingKey = `${cacheKey}:pending`;
    const revisionKey = `${cacheKey}:revision`;
    useEffect(() => {
        if (!tournoiId || !userId)
            return;
        const minuterie = window.setInterval(() => { try {
            if (navigator.onLine && localStorage.getItem(pendingKey))
                setRevisionConnexion(v => v + 1);
        }
        catch { } }, 15000);
        return () => window.clearInterval(minuterie);
    }, [tournoiId, userId, pendingKey]);
    const [messageCloud, setMessageCloud] = useState("");
    const [optionsV2, setOptionsV2] = useState<OptionsV2>(OPTIONS_V2);
    const [formatTournoi, setFormatTournoi] = useState<FormatTournoi>("complet");
    const formatParcours = formatTournoi === "doubleElimination" || formatTournoi === "consolante" ? formatTournoi : null;
    const [modePoules, setModePoules] = useState<ModePoules>("nombrePoules");
    const [nombrePoules, setNombrePoules] = useState(2);
    const [taillePoules, setTaillePoules] = useState(4);
    const [qualifiesParPoule, setQualifiesParPoule] = useState(2);
    const [poules, setPoules] = useState<Poule[]>([]);
    const [matchsPhaseFinale, setMatchsPhaseFinale] = useState<Match[]>([]);
    const [aideOuverte, setAideOuverte] = useState(false);
    const [codeJoueur, setCodeJoueur] = useState("");
    const [messageCodeJoueur, setMessageCodeJoueur] = useState("");
    const [creationEtape, setCreationEtape] = useState<"configuration" | "participants">("configuration");
    const [matchsValides, setMatchsValides] = useState<number[]>([]);
    const [ajoutMoiEnCours, setAjoutMoiEnCours] = useState(false);
    const [souvenirOuvert, setSouvenirOuvert] = useState(false);
    const [podiumPhotoUrl, setPodiumPhotoUrl] = useState("");
    const [photosExpirentAt, setPhotosExpirentAt] = useState("");
    useEffect(() => {
        if (!photosExpirentAt)
            return;
        const nettoyer = () => { if (Date.parse(photosExpirentAt) <= Date.now())
            setPodiumPhotoUrl(""); };
        nettoyer();
        const timer = window.setInterval(nettoyer, 60000);
        return () => window.clearInterval(timer);
    }, [photosExpirentAt]);
    const [scannerOuvert, setScannerOuvert] = useState(false);
    const [scannerMessage, setScannerMessage] = useState("");
    const videoScannerRef = useRef<HTMLVideoElement | null>(null);
    const scannerStreamRef = useRef<MediaStream | null>(null);
    useEffect(() => {
        let actif = true;
        if (typeof window !== "undefined") {
            setLienPartage(urlPubliqueTournoi(params.id,'partage'));
        }
        async function initialiser() {
            const generation = ++generationSync.current;
            setPret(false);
            revisionCloud.current = null;
            premiereSauvegarde.current = true;
            derniereSignature.current = '';
            suspendreSync.current = false;
            setConflitCloud(null);
            try {
                revisionCloud.current = lireRevision(localStorage.getItem(revisionKey));
                premiereSauvegarde.current = !localStorage.getItem(pendingKey);
            }
            catch { }
            if (params.id === "nouveau") {
                localStorage.removeItem(CLE);
                setNomTournoi("");
                setSport("multisport");
                setEquipes([]);
                setOptionsV2(OPTIONS_V2);
                setMatchs([]);
                setCree(false);
                setTournoiId("");
                setFormatTournoi("complet");
                setModePoules("nombrePoules");
                setNombrePoules(2);
                setTaillePoules(4);
                setQualifiesParPoule(2);
                setPoules([]);
                setMatchsPhaseFinale([]);
                setOnglet("matchs");
                setMessageCloud("");
                setCreationEtape("configuration");
                setMatchsValides([]);
                setAjoutMoiEnCours(false);
                setSouvenirOuvert(false);
                setPodiumPhotoUrl("");
                setPhotosExpirentAt("");
            }
            const chargerLocal = () => {
                const brut = localStorage.getItem(cacheKey) ?? localStorage.getItem(CLE);
                if (!brut)
                    return false;
                try {
                    const data = JSON.parse(brut);
                    if (params.id === "nouveau")
                        return false;
                    const correspondAuTournoi = Boolean(data.tournoiId) && data.tournoiId === params.id;
                    if (!correspondAuTournoi)
                        return false;
                    setNomTournoi(data.nomTournoi ?? "");
                    setSport(data.sport ?? "multisport");
                    setEquipes(data.equipes ?? []);
                    setMatchs(data.matchs ?? []);
                    setCree(Boolean(data.cree));
                    setTournoiId(data.tournoiId ?? "");
                    setOptionsV2(normaliserOptionsV2(data.optionsV2));
                    setFormatTournoi(data.formatTournoi ?? "complet");
                    setModePoules(data.modePoules ?? "nombrePoules");
                    setNombrePoules(data.nombrePoules ?? 2);
                    setTaillePoules(data.taillePoules ?? 4);
                    setQualifiesParPoule(data.qualifiesParPoule ?? 2);
                    setPoules(data.poules ?? []);
                    setMatchsPhaseFinale(data.matchsPhaseFinale ?? []);
                    setMatchsValides(data.matchsValides ?? []);
                    setPhotosExpirentAt(data.photosExpirentAt || "");
                    setPodiumPhotoUrl(data.photosExpirentAt && Date.parse(data.photosExpirentAt) <= Date.now() ? "" : data.podiumPhotoUrl ?? "");
                    return true;
                }
                catch {
                    localStorage.removeItem(CLE);
                    return false;
                }
            };
            // On charge d'abord la copie locale pour que l'écran ne reste jamais bloqué.
            const localCharge = chargerLocal();
            // Ne pas activer la sauvegarde avant la fin du chargement initial.
            try {
                const sessionResult = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
                ]);
                if (!actif || generation !== generationSync.current)
                    return;
                const user = sessionResult?.data?.session?.user;
                if (!user) {
                    if (localCharge) {
                        setMessageCloud("Mode local · connexion cloud indisponible");
                        setPret(true);
                        return;
                    }
                    window.location.href = "/login";
                    return;
                }
                setUserId(user.id);
                if (params.id === "nouveau") {
                    if (new URLSearchParams(window.location.search).get('equipes') === 'tirage') {
                        try {
                            const tirage = JSON.parse(localStorage.getItem('tourneo-tirage-equipes:v1') || 'null');
                            if (tirage?.version !== 1 || !Number.isFinite(tirage.date) || Date.now() - tirage.date > 86400000 || !Array.isArray(tirage.equipes) || tirage.equipes.length < 2 || tirage.equipes.length > 32)
                                throw new Error('Tirage absent ou expiré.');
                            const noms = nomsPourTirage(tirage.equipes.map((e: EquipeTiree) => e.nom).join('\n'));
                            const importees = tirage.equipes.map((e: EquipeTiree, i: number) => { if (!Array.isArray(e.joueurs) || e.joueurs.length > 256 || e.joueurs.some(n => typeof n !== 'string' || n.length > 100))
                                throw new Error('Liste de membres invalide.'); return { id: crypto.randomUUID(), nom: noms[i], joueurs: e.joueurs, emoji: '🏅', couleur: '#3B82F6' }; });
                            setEquipes(importees);
                            setMessageCloud('Équipes du tirage ajoutées. Choisissez votre discipline puis démarrez.');
                        }
                        catch {
                            setMessageCloud('Impossible de reprendre ce tirage. Revenez à la boîte à outils.');
                        }
                    }
                    const groupe = new URLSearchParams(window.location.search).get("groupe");
                    if (groupe && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupe)) {
                        const r = await supabase.from("tourneo_groupe_participants").select("id,nom").eq("groupe_id", groupe).order("created_at").order("id").limit(256);
                        if (r.error)
                            setMessageCloud("Impossible de charger le groupe. Vérifiez votre accès.");
                        else if (!r.data.length)
                            setMessageCloud("Ce groupe est vide ou vous n’y avez plus accès.");
                        else {
                            setEquipes(r.data.map(p => ({ id: `groupe:${p.id}`, nom: p.nom, emoji: "👤", couleur: "#3B82F6" })));
                            setMessageCloud("Liste du groupe copiée dans ce nouveau tournoi.");
                        }
                    }
                    setPret(true);
                    return;
                }
                setMessageCloud(localCharge ? "Ouverture locale · synchronisation…" : "Chargement…");
                const cloudResult = await Promise.race([
                    supabase
                        .from("tournois")
                        .select("id, nom, sport, donnees, photos_expirent_at, revision")
                        .eq("user_id", user.id)
                        .eq("id", params.id)
                        .maybeSingle(),
                    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
                ]);
                if (!actif || generation !== generationSync.current)
                    return;
                if (!cloudResult) {
                    setMessageCloud(localCharge ? "Mode local · cloud lent" : "Cloud indisponible");
                    setPret(true);
                    return;
                }
                const { data: tournoiCloud, error } = cloudResult;
                if (error) {
                    console.error(error);
                    setMessageCloud(localCharge ? "Mode local · cloud indisponible" : "Cloud indisponible");
                    setPret(true);
                    return;
                }
                if (tournoiCloud) {
                    setPhotosExpirentAt(tournoiCloud.photos_expirent_at || "");
                    if (tournoiCloud.photos_expirent_at && Date.parse(tournoiCloud.photos_expirent_at) <= Date.now())
                        setPodiumPhotoUrl("");
                }
                if (localCharge && localStorage.getItem(pendingKey)) {
                    setMessageCloud("Modifications locales · synchronisation en attente");
                }
                else if (tournoiCloud) {
                    revisionCloud.current = lireRevision(tournoiCloud.revision);
                    try {
                        localStorage.setItem(revisionKey, String(tournoiCloud.revision));
                    }
                    catch { }
                    const donnees = tournoiCloud.donnees ?? {};
                    setTournoiId(tournoiCloud.id);
                    setNomTournoi(tournoiCloud.nom ?? "");
                    setSport(tournoiCloud.sport ?? donnees.sport ?? "multisport");
                    setEquipes(donnees.equipes ?? []);
                    setMatchs(donnees.matchs ?? []);
                    setCree(Boolean(donnees.cree));
                    setOptionsV2(normaliserOptionsV2(donnees.optionsV2));
                    setFormatTournoi(donnees.formatTournoi ?? "complet");
                    setModePoules(donnees.modePoules ?? "nombrePoules");
                    setNombrePoules(donnees.nombrePoules ?? 2);
                    setTaillePoules(donnees.taillePoules ?? 4);
                    setQualifiesParPoule(donnees.qualifiesParPoule ?? 2);
                    setPoules(donnees.poules ?? []);
                    setMatchsPhaseFinale(donnees.matchsPhaseFinale ?? []);
                    setMatchsValides(donnees.matchsValides ?? []);
                    setPodiumPhotoUrl(tournoiCloud.photos_expirent_at && Date.parse(tournoiCloud.photos_expirent_at) <= Date.now() ? "" : donnees.podiumPhotoUrl ?? "");
                    setLienPartage(urlPubliqueTournoi(tournoiCloud.id,'partage'));
                    setMessageCloud("Synchronisé");
                }
                else if (!localCharge) {
                    setMessageCloud("");
                }
            }
            catch (error) {
                console.error(error);
                setMessageCloud(localCharge ? "Mode local" : "Impossible de charger le tournoi");
            }
            finally {
                if (actif && generation === generationSync.current)
                    setPret(true);
            }
        }
        initialiser();
        return () => { actif = false; };
    }, [params.id]);
    useEffect(() => {
        setMatchsPhaseFinale(matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE));
    }, [matchs]);
    useEffect(() => {
        return () => {
            scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);
    useEffect(() => {
        if (!pret)
            return;
        const copie = {
            nomTournoi,
            sport,
            equipes,
            matchs,
            cree,
            tournoiId,
            formatTournoi,
            modePoules,
            nombrePoules,
            taillePoules,
            qualifiesParPoule,
            poules,
            matchsPhaseFinale,
            matchsValides,
            podiumPhotoUrl,
            photosExpirentAt,
            optionsV2,
        };
        const signature = JSON.stringify(copie);
        if (premiereSauvegarde.current) {
            premiereSauvegarde.current = false;
            derniereSignature.current = signature;
        }
        let copieLocale = true;
        try {
            localStorage.setItem(cacheKey, signature);
        }
        catch {
            copieLocale = false;
            setMessageCloud("Sauvegarde locale indisponible · espace de stockage insuffisant");
        }
        if (!tournoiId || !userId)
            return;
        let enAttente = true;
        try {
            enAttente = Boolean(localStorage.getItem(pendingKey));
        }
        catch { }
        if (signature === derniereSignature.current && !enAttente)
            return;
        try {
            localStorage.setItem(pendingKey, "1");
        }
        catch { }
        if (conflitCloud || suspendreSync.current)
            return;
        if (!navigator.onLine) {
            setMessageCloud(copieLocale ? "Hors connexion · résultats conservés sur cet appareil" : "Hors connexion · sauvegarde impossible : exportez vos résultats avant de quitter.");
            return;
        }
        let annule = false;
        const generation = generationSync.current;
        const minuterie = window.setTimeout(() => {
            fileSynchronisation.current = fileSynchronisation.current.catch(() => { }).then(async () => {
                if (annule || suspendreSync.current || generation !== generationSync.current)
                    return;
                setMessageCloud("Synchronisation…");
                const classementSync = classementTournoi(formatTournoi, equipes, matchs, optionsV2);
                const termineSync = tournoiEstTermine(formatTournoi, equipes, matchs, optionsV2, matchsValides);
                const podiumFinalSync = classementSync.slice(0, 3).map((ligne, index) => ({
                    rang: index + 1,
                    nom: ligne.equipe.nom,
                    points: ligne.pts,
                    photo: ligne.equipe.photo || "",
                    couleur: ligne.equipe.couleur || "#3B82F6",
                }));
                const resultat = await synchroniserTournoi(supabase, tournoiId, userId, revisionCloud.current, {
                    nom: nomTournoi.trim() || "Tournoi sans nom",
                    sport,
                    donnees: {
                        sport,
                        equipes,
                        matchs,
                        cree,
                        formatTournoi,
                        modePoules,
                        nombrePoules,
                        taillePoules,
                        qualifiesParPoule,
                        poules,
                        matchsPhaseFinale,
                        matchsValides,
                        podiumPhotoUrl,
                        optionsV2,
                        termine: termineSync,
                        podiumFinal: podiumFinalSync,
                    },
                });
                if (generation !== generationSync.current)
                    return;
                if (resultat.statut === 'sauve') {
                    revisionCloud.current = resultat.version.revision;
                    try {
                        localStorage.setItem(revisionKey, String(resultat.version.revision));
                    }
                    catch { }
                    derniereSignature.current = signature;
                }
                if (annule)
                    return;
                if (resultat.statut === 'conflit') {
                    setConflitCloud(resultat.version);
                    setMessageCloud("Deux versions à comparer · votre copie locale est conservée");
                }
                else {
                    try {
                        localStorage.removeItem(pendingKey);
                    }
                    catch { }
                    setPhotosExpirentAt(resultat.version.photos_expirent_at || "");
                    if (resultat.version.photos_expirent_at && Date.parse(resultat.version.photos_expirent_at) <= Date.now())
                        setPodiumPhotoUrl("");
                    setMessageCloud("Synchronisé");
                }
            }).catch(() => { if (!annule)
                setMessageCloud("Synchronisation interrompue · nouvelle tentative automatique."); });
        }, 500);
        return () => { annule = true; window.clearTimeout(minuterie); };
    }, [
        revisionConnexion,
        conflitCloud,
        nomTournoi,
        sport,
        equipes,
        matchs,
        cree,
        tournoiId,
        userId,
        pret,
        formatTournoi,
        modePoules,
        nombrePoules,
        taillePoules,
        qualifiesParPoule,
        poules,
        matchsPhaseFinale,
        matchsValides,
        podiumPhotoUrl,
        photosExpirentAt,
        optionsV2,
    ]);
    const matchsPoules = useMemo(() => matchs.filter((match) => match.id < SEUIL_PHASE_FINALE), [matchs]);
    const matchsFinale = useMemo(() => matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE), [matchs]);
    const classement = useMemo(() => classementTournoi(formatTournoi, equipes, matchs, optionsV2), [equipes, matchs, formatTournoi, optionsV2]);
    const podium = classement.slice(0, 3);
    const journees = useMemo(() => [...new Set(matchs.map((match) => match.journee))].sort((a, b) => a - b), [matchs]);
    const joues = matchs.filter((match) => match.score1 !== "" && match.score2 !== "").length;
    const modificationParticipantsAutorisee = joues === 0;
    const nombrePoulesActuel = poules.length || Math.max(2, nombrePoules);
    const qualifiesTheoriques = nombrePoulesActuel * qualifiesParPoule;
    const totalMatchsTheorique = formatTournoi === "suisse" ? Math.floor(equipes.length / 2) * optionsV2.rondes : formatTournoi === "elimination"
        ? Math.max(0, equipes.length - 1)
        : formatTournoi === "poulesFinale" && estPuissanceDeDeux(qualifiesTheoriques)
            ? matchsPoules.length + qualifiesTheoriques - 1
            : matchs.length;
    const progression = totalMatchsTheorique
        ? Math.min(100, Math.round((joues / totalMatchsTheorique) * 100))
        : 0;
    function trouverEquipe(id: string): Equipe | undefined {
        return equipes.find((equipe) => equipe.id === id) ?? (id.startsWith("duo:") ? { id, nom: nomParticipant(id, equipes), emoji: "🤝", couleur: "#3B82F6" } : undefined);
    }
    function genererPoules(equipesDepart: Equipe[]) {
        const melangees = [...equipesDepart];
        const nbPoules = modePoules === "nombrePoules"
            ? Math.max(2, Math.min(nombrePoules, melangees.length))
            : Math.max(2, Math.ceil(melangees.length / Math.max(2, taillePoules)));
        const poulesGenerees: Poule[] = Array.from({ length: nbPoules }, (_, index) => ({
            id: `poule-${index + 1}`,
            nom: `Poule ${String.fromCharCode(65 + index)}`,
            terrain: "",
            equipes: [],
        }));
        repartirPoules(melangees, nbPoules, optionsV2.tirage).forEach((participants, i) => { poulesGenerees[i].equipes = participants; });
        return poulesGenerees;
    }
    function genererMatchsPoules(poulesSource: Poule[]) {
        let prochainId = 1;
        return poulesSource.flatMap((poule) => genererMatchs(poule.equipes).map((match) => ({
            ...match,
            id: prochainId++,
        })));
    }
    function genererTourElimination(equipesTour: Equipe[], journee: number, idDepart = SEUIL_PHASE_FINALE) {
        return genererMatchsElimination(equipesTour).map((match, index) => ({
            ...match,
            id: idDepart + index,
            journee,
        }));
    }
    function validerConfiguration(equipesSource: Equipe[], format = formatTournoi) {
        if (equipesSource.length > 256)
            return "Un tournoi est limité à 256 participants.";
        if (format === "rotation" && equipesSource.length < 4)
            return "Prévoyez au moins quatre joueurs pour les doubles tournants.";
        if (equipesSource.length < 2) {
            return "Ajoute au moins deux participants.";
        }
        if ((format === "elimination" || format === "consolante") && !estPuissanceDeDeux(equipesSource.length)) {
            return "Pour l’élimination directe, utilise 2, 4, 8, 16, 32 ou 64 participants.";
        }
        if (format === "poules" || format === "poulesFinale") {
            const poulesTest = genererPoules(equipesSource);
            const plusPetitePoule = Math.min(...poulesTest.map((poule) => poule.equipes.length));
            if (plusPetitePoule < 2)
                return "Chaque poule doit contenir au moins deux participants. Ajustez la répartition.";
            if (format === "poulesFinale") {
                if (qualifiesParPoule < 1 || qualifiesParPoule > plusPetitePoule) {
                    return `Choisis entre 1 et ${plusPetitePoule} qualifié(s) par poule.`;
                }
                const totalQualifies = poulesTest.length * qualifiesParPoule;
                if (!estPuissanceDeDeux(totalQualifies)) {
                    return "Le nombre total de qualifiés doit être 2, 4, 8, 16, 32 ou 64 pour construire la phase finale.";
                }
            }
        }
        return "";
    }
    function construireStructure(equipesSource: Equipe[]) {
        if (formatTournoi === "rotation")
            return { nouvellesPoules: [] as Poule[], nouveauxMatchs: genererPartenairesTournants(equipesSource, optionsV2.rondes) };
        if (formatTournoi === "suisse") {
            const ronde = prochaineRondeSuisse(melanger(equipesSource), [], 1, [], optionsV2);
            setOptionsV2(o => ({ ...o, exemptions: ronde.exemptId ? [{ ronde: 1, id: ronde.exemptId }] : [] }));
            return { nouvellesPoules: [] as Poule[], nouveauxMatchs: ronde.matchs };
        }
        if (formatParcours)
            return { nouvellesPoules: [] as Poule[], nouveauxMatchs: prochainTourParcours(formatParcours, ordreElimination(equipesSource, optionsV2.tirage), []) };
        if ((formatTournoi === "complet" || formatTournoi === "allerRetour")) {
            return {
                nouvellesPoules: [] as Poule[],
                nouveauxMatchs: formatTournoi === "allerRetour" ? genererMatchsAllerRetour(equipesSource) : genererMatchs(equipesSource),
            };
        }
        if (formatTournoi === "elimination") {
            const equipesMelangees = ordreElimination(equipesSource, optionsV2.tirage);
            return {
                nouvellesPoules: [] as Poule[],
                nouveauxMatchs: genererTourElimination(equipesMelangees, 1),
            };
        }
        const nouvellesPoules = genererPoules(equipesSource);
        return {
            nouvellesPoules,
            nouveauxMatchs: genererMatchsPoules(nouvellesPoules),
        };
    }
    function obtenirQualifiesCroises(matchsSource: Match[]) {
        const qualifies = poules.flatMap((poule, pouleIndex) => {
            const ids = new Set(poule.equipes.map((equipe) => equipe.id));
            const matchsDeLaPoule = matchsSource.filter((match) => ids.has(match.equipe1Id) && ids.has(match.equipe2Id));
            const classementPoule = calculerClassement(poule.equipes, matchsDeLaPoule, optionsV2);
            return classementPoule.slice(0, qualifiesParPoule).map((ligne, rang) => ({
                equipe: ligne.equipe,
                pouleIndex,
                rang,
            }));
        });
        const restants = [...qualifies].sort((a, b) => a.rang - b.rang || a.pouleIndex - b.pouleIndex);
        const ordre: Equipe[] = [];
        while (restants.length > 0) {
            const premier = restants.shift();
            if (!premier)
                break;
            let indexAdversaire = -1;
            for (let i = restants.length - 1; i >= 0; i -= 1) {
                if (restants[i].pouleIndex !== premier.pouleIndex) {
                    indexAdversaire = i;
                    break;
                }
            }
            if (indexAdversaire < 0)
                indexAdversaire = 0;
            const [adversaire] = restants.splice(indexAdversaire, 1);
            ordre.push(premier.equipe);
            if (adversaire)
                ordre.push(adversaire.equipe);
        }
        return ordre;
    }
    async function importerParticipants(event: ChangeEvent<HTMLInputElement>) {
        const fichier = event.target.files?.[0];
        event.target.value = "";
        if (!fichier || !modificationParticipantsAutorisee || verrouImport.current)
            return;
        verrouImport.current = true;
        setImportEnCours(true);
        setNomsImportes([]);
        setMessageImport("Lecture de la liste…");
        const generation = ++generationImport.current;
        try {
            const noms = await lireFichierParticipants(fichier);
            if (generation !== generationImport.current)
                return;
            setNomsImportes(noms);
            setMessageImport(noms.length ? `${noms.length} nom(s) détecté(s). Vérifiez l’aperçu avant de les ajouter.` : "Aucun nom trouvé dans la première feuille ou colonne Nom.");
        }
        catch (erreur) {
            if (generation === generationImport.current)
                setMessageImport(erreur instanceof Error ? erreur.message : "Import impossible.");
        }
        finally {
            if (generation === generationImport.current) {
                verrouImport.current = false;
                setImportEnCours(false);
            }
        }
    }
    function ajouterImport() {
        if (!modificationParticipantsAutorisee || verrouImport.current || !nomsImportes.length)
            return;
        verrouImport.current = true;
        try {
            const ajouts = nomsAAjouter(equipes.map(e => e.nom), nomsImportes);
            setEquipes([...equipes, ...ajouts.map(nom => ({ id: crypto.randomUUID(), nom, emoji: "🏅", couleur: "#3B82F6" }))]);
            setMessageImport(`${ajouts.length} participant(s) ajouté(s) · ${nomsImportes.length - ajouts.length} déjà présent(s).`);
            setNomsImportes([]);
        }
        catch (erreur) {
            setMessageImport(erreur instanceof Error ? erreur.message : "Import impossible.");
        }
        finally {
            verrouImport.current = false;
        }
    }
    function enregistrerEquipe(equipe: Equipe) {
        if (cree && !modificationParticipantsAutorisee && !equipeAModifier)
            return;
        const doublon = equipes.some((item) => item.id !== equipeAModifier?.id &&
            item.nom.trim().toLowerCase() === equipe.nom.trim().toLowerCase());
        if (doublon) {
            alert("Un participant porte déjà ce nom.");
            return;
        }
        const nouvellesEquipes = equipeAModifier
            ? equipes.map((item) => item.id === equipeAModifier.id ? (cree && !modificationParticipantsAutorisee ? modifierEquipeEnCours(item, equipe) : { ...item, ...equipe, id: equipeAModifier.id }) : item)
            : [...equipes, equipe];
        setEquipes(nouvellesEquipes);
        if (cree && !modificationParticipantsAutorisee) {
            setPoules(p => p.map(g => ({ ...g, equipes: g.equipes.map(e => nouvellesEquipes.find(n => n.id === e.id) || e) })));
            setMessageCloud("Équipe modifiée · résultats et planning conservés");
        }
        if (cree && modificationParticipantsAutorisee) {
            setMatchs([]);
            setPoules([]);
            setMessageCloud("Participants modifiés · recalcule le tournoi pour appliquer la nouvelle structure");
            setOnglet("participants");
        }
        setModalOuvert(false);
        setEquipeAModifier(null);
    }
    const [operationTournoi, setOperationTournoi] = useState(false);
    async function preparerSupport(destination: 'inscriptions' | 'affiche' | 'arbitres' = 'inscriptions') {
        if (operationTournoi)
            return;
        if (!nomTournoi.trim()) {
            alert("Ajoutez le nom du tournoi.");
            return;
        }
        if (!userId) {
            window.location.href = "/login";
            return;
        }
        setOperationTournoi(true);
        suspendreSync.current = true;
        try {
            await fileSynchronisation.current.catch(() => {});
            let id = tournoiId;
            if (!id) {
                const { data, error } = await supabase.from("tournois").insert({
                    nom: nomTournoi.trim(), sport, user_id: userId,
                    donnees: { sport, equipes, matchs: [], cree: false, optionsV2, formatTournoi, modePoules, nombrePoules, taillePoules, qualifiesParPoule, poules: [], matchsValides: [] },
                }).select("id").single();
                if (error)
                    throw error;
                id = data.id;
            }
            else {
                const classementSupport = classementTournoi(formatTournoi, equipes, matchs, optionsV2);
                const resultat = await synchroniserTournoi(supabase, id, userId, revisionCloud.current, {
                    nom: nomTournoi.trim(), sport,
                    donnees: {sport,equipes,matchs,cree,optionsV2,formatTournoi,modePoules,nombrePoules,taillePoules,qualifiesParPoule,poules,matchsPhaseFinale,matchsValides,podiumPhotoUrl,
                        termine:tournoiEstTermine(formatTournoi,equipes,matchs,optionsV2,matchsValides),podiumFinal:classementSupport.slice(0,3).map((l,i)=>({rang:i+1,nom:l.equipe.nom,points:l.pts,photo:l.equipe.photo||'',couleur:l.equipe.couleur||'#3B82F6'}))},
                });
                if(resultat.statut==='conflit'){setConflitCloud(resultat.version);throw new Error('Une autre version existe en ligne. Comparez les versions avant de continuer.');}
                revisionCloud.current=resultat.version.revision;
                try{localStorage.setItem(revisionKey,String(resultat.version.revision));localStorage.removeItem(pendingKey);}catch{}
            }
            window.location.href = `/tournoi/${id}/${destination}`;
        }
        catch (erreur) {
            alert(erreur instanceof Error ? erreur.message : "Impossible d’enregistrer le tournoi avant de continuer.");
            suspendreSync.current = false;
            setOperationTournoi(false);
        }
    }
    async function lancerTournoi() {
        if (operationTournoi)
            return;
        if (!nomTournoi.trim()) {
            alert("Ajoute un nom au tournoi.");
            return;
        }
        if (!userId) {
            window.location.href = "/login";
            return;
        }
        setOperationTournoi(true);
        suspendreSync.current = true;
        try {
            await fileSynchronisation.current.catch(() => { });
            let participants = equipes;
            if (tournoiId) {
                const { data: demandes, error } = await supabase.from("tourneo_inscriptions").select("id,nom,joueurs,user_id,type_participant").eq("tournoi_id", tournoiId).eq("statut", "accepte");
                if (error)
                    throw error;
                const nouveaux = (demandes ?? []).filter((r) => !participants.some((e) => e.id === `inscription:${r.id}`));
                const profilsInscrits = new Set(nouveaux.filter(r => r.type_participant === "individuel" && r.user_id).map(r => r.user_id));
                participants = participants.filter(e => !profilsInscrits.has(e.profilId ?? e.id));
                if (nouveaux.some((r) => participants.some((e) => e.nom.trim().toLocaleLowerCase("fr") === r.nom.trim().toLocaleLowerCase("fr"))))
                    throw new Error("Un participant manuel porte le nom d’une inscription acceptée. Renommez-le avant de démarrer.");
                participants = [...participants, ...nouveaux.map((r) => ({ id: `inscription:${r.id}`, nom: r.nom, joueurs: r.joueurs, profilId: r.type_participant === "individuel" ? r.user_id ?? undefined : undefined, emoji: "🏅", couleur: "#3B82F6" }))];
            }
            const erreurConfiguration = validerConfiguration(participants);
            if (erreurConfiguration)
                throw new Error(erreurConfiguration);
            const { nouvellesPoules, nouveauxMatchs } = construireStructure(participants);
            const optionsInitiales = formatTournoi === "suisse" ? { ...optionsV2, exemptions: participants.filter(e => !nouveauxMatchs.some(m => m.equipe1Id === e.id || m.equipe2Id === e.id)).map(e => ({ ronde: 1, id: e.id })) } : { ...optionsV2, exemptions: [] };
            const donnees = { sport, equipes: participants, matchs: nouveauxMatchs, cree: true, optionsV2: optionsInitiales, formatTournoi, modePoules, nombrePoules, taillePoules, qualifiesParPoule, poules: nouvellesPoules,
                matchsPhaseFinale: nouveauxMatchs.filter((m) => m.id >= SEUIL_PHASE_FINALE), matchsValides: [], podiumPhotoUrl: "", termine: false, podiumFinal: [] };
            setMessageCloud("Création du tournoi…");
            let id = tournoiId;
            if (id) {
                const { error } = await supabase.rpc("tourneo_demarrer", { p_tournoi: id, p_donnees: donnees, p_nom: nomTournoi.trim(), p_sport: sport });
                if (error)
                    throw error;
                try {
                    localStorage.removeItem(pendingKey);
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(revisionKey);
                }
                catch { }
                window.location.assign(`/tournoi/${id}`);
                return;
            }
            else {
                const { data, error } = await supabase.from("tournois").insert({ nom: nomTournoi.trim(), sport, user_id: userId, donnees }).select("id,revision").single();
                if (error)
                    throw error;
                id = data.id;
                revisionCloud.current = lireRevision(data.revision);
            }
            try {
                localStorage.setItem(`${CLE}:${id}:revision`, String(revisionCloud.current));
            }
            catch { }
            suspendreSync.current = false;
            setOptionsV2(optionsInitiales);
            setEquipes(participants);
            setPoules(nouvellesPoules);
            setMatchs(nouveauxMatchs);
            setTournoiId(id);
            setCree(true);
            setOnglet("matchs");
            setLienPartage(urlPubliqueTournoi(id,'partage'));
            window.history.replaceState({}, "", `/tournoi/${id}`);
            setMessageCloud("Synchronisé");
        }
        catch (erreur) {
            suspendreSync.current = false;
            setMessageCloud("Démarrage interrompu");
            alert(erreur && typeof erreur === "object" && "message" in erreur ? String(erreur.message) : "Impossible de démarrer le tournoi.");
        }
        finally {
            setOperationTournoi(false);
        }
    }
    function recalculerTournoi() {
        if (!modificationParticipantsAutorisee) {
            alert("Le tournoi ne peut plus être modifié après le premier résultat.");
            return;
        }
        const erreurConfiguration = validerConfiguration(equipes);
        if (erreurConfiguration) {
            alert(erreurConfiguration);
            return;
        }
        const { nouvellesPoules, nouveauxMatchs } = construireStructure(equipes);
        setPoules(nouvellesPoules);
        setMatchs(nouveauxMatchs);
        setOnglet("matchs");
        setMessageCloud("Structure recalculée");
    }
    function changerManches(match: Match, manches: NonNullable<Match["manches"]>) {
        const resultat = resultatSerie(manches, optionsV2.setsGagnants);
        const utilisables = manches.slice(0, resultat.victoires1 + resultat.victoires2);
        const fini = resultat.vainqueur !== null && utilisables.every(m => m.score1 !== "" && m.score2 !== "" && Number(m.score1) !== Number(m.score2));
        setMatchs(actuels => actuels.map(m => m.id === match.id ? { ...m, manches, score1: fini ? String(resultat.victoires1) : "", score2: fini ? String(resultat.victoires2) : "" } : m));
    }
    function changerScore(id: number, champ: "score1" | "score2", valeur: string) {
        if (matchsValides.includes(id))
            return;
        setMatchs((actuels) => actuels.map((match) => match.id === id ? { ...match, [champ]: valeur } : match));
    }
    function avancerTournoiSiPossible(matchsSource: Match[], validesSource: number[]) {
        if (formatTournoi === "suisse") {
            const numero = Math.max(0, ...matchsSource.map(m => m.journee)) + 1;
            if (numero > optionsV2.rondes || !matchsSource.every(m => validesSource.includes(m.id)))
                return matchsSource;
            const ronde = prochaineRondeSuisse(equipes, matchsSource, numero, optionsV2.exemptions.map(e => e.id), optionsV2);
            if (ronde.exemptId)
                setOptionsV2(o => ({ ...o, exemptions: [...o.exemptions.filter(e => e.ronde !== numero), { ronde: numero, id: ronde.exemptId! }] }));
            return [...matchsSource, ...ronde.matchs];
        }
        if (formatParcours) {
            if (!matchsSource.every(m => validesSource.includes(m.id)))
                return matchsSource;
            return [...matchsSource, ...prochainTourParcours(formatParcours, equipes, matchsSource)];
        }
        if (formatTournoi === "rotation" || (formatTournoi === "complet" || formatTournoi === "allerRetour") || formatTournoi === "poules")
            return matchsSource;
        if (formatTournoi === "poulesFinale") {
            const poulesSource = matchsSource.filter((match) => match.id < SEUIL_PHASE_FINALE);
            const finaleExistante = matchsSource.filter((match) => match.id >= SEUIL_PHASE_FINALE);
            const poulesTerminees = poulesSource.length > 0 &&
                poulesSource.every((match) => match.score1 !== "" &&
                    match.score2 !== "" &&
                    validesSource.includes(match.id));
            if (finaleExistante.length === 0 && poulesTerminees) {
                const qualifies = obtenirQualifiesCroises(poulesSource);
                if (!estPuissanceDeDeux(qualifies.length))
                    return matchsSource;
                const derniereJourneePoules = Math.max(...poulesSource.map((match) => match.journee));
                return [...matchsSource, ...genererTourElimination(qualifies, derniereJourneePoules + 1)];
            }
        }
        const elimination = matchsSource.filter((match) => formatTournoi === "elimination" ? true : match.id >= SEUIL_PHASE_FINALE);
        if (elimination.length === 0)
            return matchsSource;
        const derniereJournee = Math.max(...elimination.map((match) => match.journee));
        const tour = elimination.filter((match) => match.journee === derniereJournee);
        const tourValide = tour.length > 0 &&
            tour.every((match) => match.score1 !== "" &&
                match.score2 !== "" &&
                Number(match.score1) !== Number(match.score2) &&
                validesSource.includes(match.id));
        if (!tourValide)
            return matchsSource;
        const vainqueurs = tour
            .map((match) => {
            const gagnantId = Number(match.score1) > Number(match.score2)
                ? match.equipe1Id
                : match.equipe2Id;
            return equipes.find((equipe) => equipe.id === gagnantId);
        })
            .filter((equipe): equipe is Equipe => Boolean(equipe));
        if (vainqueurs.length <= 1)
            return matchsSource;
        const existe = elimination.some((match) => match.journee === derniereJournee + 1);
        if (existe)
            return matchsSource;
        const prochainId = Math.max(SEUIL_PHASE_FINALE, ...matchsSource.map((match) => match.id + 1));
        return [
            ...matchsSource,
            ...genererTourElimination(vainqueurs, derniereJournee + 1, prochainId),
        ];
    }
    function changerSport(valeur: string) { setSport(valeur); setOptionsV2(o => ({ ...o, ...reglesPourSport(valeur) })); }
    function validerScore(match: Match) {
        if (!/^(0|[1-9]\d*)$/.test(match.score1) || !/^(0|[1-9]\d*)$/.test(match.score2) || !Number.isSafeInteger(Number(match.score1)) || !Number.isSafeInteger(Number(match.score2))) {
            alert("Saisissez les deux scores avant de valider.");
            return;
        }
        if ((formatParcours || formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE) &&
            Number(match.score1) === Number(match.score2)) {
            alert("Un vainqueur est nécessaire pour ce match.");
            return;
        }
        const erreurSport = erreurScoreSport(sport, Number(match.score1), Number(match.score2), optionsV2, match.manches);
        if (erreurSport) {
            alert(erreurSport);
            return;
        }
        const nouveauxValides = [...new Set([...matchsValides, match.id])];
        setMatchsValides(nouveauxValides);
        setMatchs(avancerTournoiSiPossible(matchs, nouveauxValides));
    }
    function corrigerScore(match: Match) {
        const toursSuivants = matchs.some((item) => item.journee > match.journee);
        if (toursSuivants && (formatTournoi === "suisse" || formatParcours || formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE)) {
            if (!confirm("Corriger ce résultat supprimera les tours générés après celui-ci. Continuer ?"))
                return;
            setOptionsV2(o => ({ ...o, exemptions: o.exemptions.filter(e => e.ronde <= match.journee) }));
            setMatchs((actuels) => actuels.filter((item) => item.journee <= match.journee));
            setMatchsValides((actuels) => actuels.filter((id) => {
                const cible = matchs.find((item) => item.id === id);
                return !cible || cible.journee <= match.journee;
            }).filter((id) => id !== match.id));
            return;
        }
        setMatchsValides((actuels) => actuels.filter((id) => id !== match.id));
    }
    function scoreModifiable(match: Match) {
        return !matchsValides.includes(match.id);
    }
    async function ajouterMonProfil() {
        if (!userId)
            return;
        setAjoutMoiEnCours(true);
        setMessageCodeJoueur("Chargement de votre profil…");
        const { data, error } = await supabase
            .from("profiles")
            .select("id, display_name, player_code, avatar_url, favorite_color")
            .eq("id", userId)
            .maybeSingle();
        if (error || !data) {
            setMessageCodeJoueur("Créez d’abord votre profil Tourneo.");
            setAjoutMoiEnCours(false);
            return;
        }
        if (equipes.some((equipe) => equipe.id === userId)) {
            setMessageCodeJoueur("Votre profil est déjà dans ce tournoi.");
            setAjoutMoiEnCours(false);
            return;
        }
        enregistrerEquipe({
            id: userId,
            profilId: userId,
            nom: data.display_name || data.player_code || "Moi",
            emoji: "●",
            couleur: data.favorite_color || "#3B82F6",
            photo: data.avatar_url || undefined,
        });
        setMessageCodeJoueur("Votre profil a été ajouté.");
        setAjoutMoiEnCours(false);
    }
    async function ajouterProfilParCode(codeBrut: string) {
        const code = codeBrut.trim().toUpperCase();
        if (!code)
            return false;
        setMessageCodeJoueur("Recherche du joueur…");
        const { data, error } = await supabase
            .rpc("tourneo_profils_publics", { p_code: code })
            .select("id, display_name, player_code, avatar_url, favorite_color")
            .maybeSingle();
        if (error || !data) {
            setMessageCodeJoueur("Code Tourneo introuvable.");
            return false;
        }
        if (equipes.some((equipe) => equipe.id === data.id)) {
            setMessageCodeJoueur("Ce joueur participe déjà au tournoi.");
            return false;
        }
        const nouvelleEquipe: Equipe = {
            id: data.id,
            profilId: data.id,
            nom: data.display_name || data.player_code,
            emoji: "👤",
            couleur: data.favorite_color || "#3B82F6",
            photo: data.avatar_url || undefined,
        };
        setEquipes((actuelles) => [...actuelles, nouvelleEquipe]);
        setCodeJoueur("");
        setMessageCodeJoueur(`${nouvelleEquipe.nom} ajouté via son profil Tourneo.`);
        return true;
    }
    async function ajouterViaCodeTourneo() {
        await ajouterProfilParCode(codeJoueur);
    }
    function extraireCodeTourneoDepuisQr(valeur: string) {
        const brut = valeur.trim();
        if (!brut)
            return "";
        try {
            const objet = JSON.parse(brut);
            const possible = objet?.player_code ?? objet?.playerCode ?? objet?.code;
            if (typeof possible === "string")
                return possible.trim().toUpperCase();
        }
        catch {
            // Le QR peut être un code simple ou une URL.
        }
        try {
            const url = new URL(brut);
            const possible = url.searchParams.get("player_code") ||
                url.searchParams.get("playerCode") ||
                url.searchParams.get("code");
            if (possible)
                return possible.trim().toUpperCase();
        }
        catch {
            // Ce n'est pas une URL, on continue.
        }
        const correspondance = brut.toUpperCase().match(/TRN-[A-Z0-9-]{4,}/);
        return correspondance?.[0] ?? brut.toUpperCase();
    }
    function fermerScanner() {
        scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
        scannerStreamRef.current = null;
        setScannerOuvert(false);
        setScannerMessage("");
    }
    async function ouvrirScanner() {
        setScannerMessage("");
        setScannerOuvert(true);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        const video = videoScannerRef.current;
        if (!video) {
            setScannerMessage("Impossible d’ouvrir la caméra.");
            return;
        }
        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
            setScannerMessage("Le scan QR n’est pas pris en charge par ce navigateur. Utilisez le code joueur.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            scannerStreamRef.current = stream;
            video.srcObject = stream;
            await video.play();
            const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
            let actif = true;
            const scanner = async () => {
                if (!actif || !scannerStreamRef.current || !videoScannerRef.current)
                    return;
                try {
                    if (video.readyState >= 2) {
                        const codes = await detector.detect(video);
                        const valeur = codes?.[0]?.rawValue;
                        if (valeur) {
                            actif = false;
                            const code = extraireCodeTourneoDepuisQr(String(valeur));
                            setCodeJoueur(code);
                            const ajoute = await ajouterProfilParCode(code);
                            fermerScanner();
                            if (!ajoute)
                                setMessageCodeJoueur(`QR lu : ${code}`);
                            return;
                        }
                    }
                }
                catch {
                    // On continue la détection sur l'image suivante.
                }
                window.setTimeout(scanner, 250);
            };
            scanner();
        }
        catch {
            setScannerMessage("Accès caméra refusé ou indisponible. Autorisez la caméra ou utilisez le code joueur.");
        }
    }
    async function seDeconnecter() {
        const { error } = await deconnecterTourneo();
        if (error) {
            alert("Impossible de se déconnecter pour le moment.");
            return;
        }
        window.location.href = "/login";
    }
    async function copierLien() {
        if (!tournoiId || !lienPartage || lienPartage.endsWith("/nouveau")) {
            setMessageCloud("Enregistrez d’abord le tournoi pour obtenir son lien public.");
            return;
        }
        try {
            await navigator.clipboard.writeText(lienPartage);
            setMessageCloud("Lien copié");
        }
        catch {
            prompt("Copie ce lien :", lienPartage);
        }
    }
    async function choisirPhotoPodium(event: ChangeEvent<HTMLInputElement>) {
        const fichier = event.target.files?.[0];
        if (!fichier)
            return;
        if (photosExpirentAt && Date.parse(photosExpirentAt) <= Date.now()) {
            setMessageCloud("La période de conservation des photos de ce tournoi est terminée.");
            return;
        }
        if (!fichier.type.startsWith("image/")) {
            alert("Choisissez une image.");
            return;
        }
        // Aperçu immédiat, même si le réseau est lent.
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const lecteur = new FileReader();
            lecteur.onload = () => typeof lecteur.result === "string" ? resolve(lecteur.result) : reject(new Error("Lecture impossible"));
            lecteur.onerror = () => reject(new Error("Lecture impossible"));
            lecteur.readAsDataURL(fichier);
        });
        setPodiumPhotoUrl(dataUrl);
        // La photo reste privée dans le stockage du propriétaire.
        if (tournoiId && userId) {
            try {
                setMessageCloud("Envoi de la photo du podium…");
                const extension = fichier.name.split(".").pop() || "jpg";
                const chemin = `${userId}/tournois/${tournoiId}/podium-${Date.now()}.${extension}`;
                const { error } = await supabase.storage.from("tourneo-media").upload(chemin, fichier, { upsert: true });
                if (!error) {
                    setPodiumPhotoUrl(referencePhoto(chemin));
                    setMessageCloud("Photo du podium synchronisée");
                }
                else {
                    console.error("Upload photo podium :", error);
                    setMessageCloud("Photo conservée sur cet appareil");
                }
            }
            catch (error) {
                console.error(error);
                setMessageCloud("Photo conservée sur cet appareil");
            }
        }
    }
    function chargerImage(src: string) {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Image inaccessible"));
            img.src = src;
        });
    }
    async function genererAfficheBlob() {
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Canvas indisponible");
        const fond = ctx.createLinearGradient(0, 0, 1600, 900);
        fond.addColorStop(0, "#07101E");
        fond.addColorStop(.55, "#0D1830");
        fond.addColorStop(1, "#111B31");
        ctx.fillStyle = fond;
        ctx.fillRect(0, 0, 1600, 900);
        ctx.fillStyle = "#72E7FF";
        ctx.font = "700 28px Arial";
        ctx.fillText("TOURNEO · RÉSULTATS OFFICIELS", 70, 80);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "900 58px Arial";
        ctx.fillText(nomTournoi || "Tournoi", 70, 145);
        ctx.fillStyle = "#9CB1C9";
        ctx.font = "600 26px Arial";
        ctx.fillText(`${LIBELLES_SPORT[sport] ?? sport} · ${LIBELLES_FORMAT[formatTournoi]}`, 70, 190);
        if (podiumPhotoUrl) {
            try {
                const img = await chargerImage(await urlPhotoPrivee(podiumPhotoUrl));
                const x = 70, y = 230, w = 900, h = 590;
                const ratio = Math.max(w / img.width, h / img.height);
                const sw = w / ratio, sh = h / ratio;
                const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, 30);
                ctx.clip();
                ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
                ctx.restore();
            }
            catch {
                // L’affiche reste partageable même si l’image distante n’est pas lisible.
            }
        }
        else {
            ctx.fillStyle = "rgba(255,255,255,.04)";
            ctx.fillRect(70, 230, 900, 590);
            ctx.fillStyle = "#8293A9";
            ctx.font = "600 30px Arial";
            ctx.fillText("Photo du podium", 365, 530);
        }
        ctx.fillStyle = "#72E7FF";
        ctx.font = "800 24px Arial";
        ctx.fillText("PODIUM FINAL", 1040, 250);
        const ordre = [podium[0], podium[1], podium[2]].filter(Boolean);
        ordre.forEach((ligne, index) => {
            const y = 340 + index * 150;
            const rang = index + 1;
            ctx.fillStyle = rang === 1 ? "#E5BE60" : rang === 2 ? "#AEBED2" : "#C88A5C";
            ctx.beginPath();
            ctx.roundRect(1040, y - 48, 78, 78, 22);
            ctx.fill();
            ctx.fillStyle = "#08111F";
            ctx.font = "900 34px Arial";
            ctx.textAlign = "center";
            ctx.fillText(String(rang), 1079, y + 3);
            ctx.textAlign = "left";
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "800 31px Arial";
            ctx.fillText(ligne.equipe.nom.slice(0, 22), 1140, y - 3);
            ctx.fillStyle = "#9CB1C9";
            ctx.font = "600 23px Arial";
            ctx.fillText(`${ligne.pts} pts`, 1140, y + 35);
        });
        ctx.fillStyle = "#8DA1BA";
        ctx.font = "600 22px Arial";
        ctx.fillText("Retrouvez le tournoi :", 1040, 775);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "600 20px Arial";
        const lienCourt = lienPartage.replace("https://", "");
        ctx.fillText(lienCourt.slice(0, 42), 1040, 810);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Création de l’image impossible")), "image/png", .95);
        });
    }
    async function partagerAfficheSouvenir() {
        try {
            const blob = await genererAfficheBlob();
            const nomFichier = `${(nomTournoi || "tourneo").replace(/[^a-z0-9_-]+/gi, "-")}-podium.png`;
            const fichier = new File([blob], nomFichier, { type: "image/png" });
            const nav = navigator as Navigator & {
                canShare?: (data: ShareData) => boolean;
            };
            if (navigator.share && nav.canShare?.({ files: [fichier] })) {
                await navigator.share({
                    title: `Podium · ${nomTournoi}`,
                    text: `Résultats de ${nomTournoi} sur Tourneo
${lienPartage}`,
                    files: [fichier],
                });
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = nomFichier;
            a.click();
            URL.revokeObjectURL(url);
            setMessageCloud("Affiche enregistrée. Vous pouvez maintenant la joindre à votre message.");
        }
        catch (error) {
            console.error(error);
            alert("Impossible de partager l’affiche sur cet appareil. Utilisez « Imprimer / enregistrer en PDF ».");
        }
    }
    async function partagerTournoi() {
        if (navigator.share) {
            await navigator.share({
                title: nomTournoi,
                text: `Suis le tournoi ${nomTournoi} sur Tourneo`,
                url: lienPartage,
            });
            return;
        }
        await copierLien();
    }
    function sauvegarderFichier() {
        telechargerSauvegarde({ version: 2, nomTournoi, sport, formatTournoi, equipes, matchs, matchsValides, optionsV2, poules });
    }
    async function restaurerFichier(event: ChangeEvent<HTMLInputElement>) {
        const fichier = event.target.files?.[0];
        event.target.value = "";
        if (!fichier)
            return;
        try {
            if (fichier.size > 5000000)
                throw new Error("Fichier limité à 5 Mo.");
            const d = lireSauvegarde(await fichier.text());
            if (!confirm("Remplacer les résultats de ce tournoi par la sauvegarde ? Téléchargez d’abord vos résultats actuels si vous souhaitez les conserver."))
                return;
            setNomTournoi(d.nomTournoi);
            setSport(d.sport);
            setEquipes(d.equipes);
            setMatchs(d.matchs);
            setMatchsValides(d.matchsValides);
            setOptionsV2(d.optionsV2);
            setFormatTournoi(d.formatTournoi as FormatTournoi);
            setPoules(d.poules ?? []);
            setOnglet("matchs");
            setMessageCloud("Sauvegarde restaurée · synchronisation en attente");
        }
        catch (erreur) {
            alert(erreur instanceof Error ? erreur.message : "Sauvegarde illisible.");
        }
    }
    function exporterClassement() {
        const url = URL.createObjectURL(new Blob([classementCSV(equipes, matchs, optionsV2)], { type: "text/csv;charset=utf-8" }));
        const lien = document.createElement("a");
        lien.href = url;
        lien.download = "tourneo-classement.csv";
        lien.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function exporterPDF() {
        window.location.href = `/tournoi/${tournoiId}/imprimer`;
    }
    async function supprimerTournoi() {
        if (!confirm("Supprimer définitivement ce tournoi ?"))
            return;
        if (tournoiId) {
            const { error } = await supabase.from("tournois").delete().eq("id", tournoiId);
            if (error) {
                console.error(error);
                alert("La suppression dans le cloud a échoué.");
                return;
            }
        }
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(CLE);
        window.location.href = "/dashboard";
    }
    function titreJournee(journee: number) {
        const matchsJournee = matchs.filter((match) => match.journee === journee);
        if (formatTournoi === "suisse")
            return `Ronde ${journee} / ${optionsV2.rondes}`;
        if (formatParcours)
            return `Tour ${journee}`;
        const estFinale = matchsJournee.some((match) => match.id >= SEUIL_PHASE_FINALE);
        if (formatTournoi === "elimination" || estFinale) {
            return nomTourDepuisNombreMatchs(matchsJournee.length);
        }
        if (formatTournoi === "poules" || formatTournoi === "poulesFinale") {
            return `Poules · journée ${journee}`;
        }
        return `Journée ${journee}`;
    }
    function renduClassementPoule(poule: Poule) {
        const ids = new Set(poule.equipes.map((equipe) => equipe.id));
        const matchsDeLaPoule = matchsPoules.filter((match) => ids.has(match.equipe1Id) && ids.has(match.equipe2Id));
        const lignes = calculerClassement(poule.equipes, matchsDeLaPoule, optionsV2);
        return (<div key={poule.id} style={styles.poolCard}>
        <div style={styles.poolHeader}>
          <div>
            <span style={styles.eyebrow}>{poule.nom}</span>
            <h3 style={styles.poolTitle}>{poule.terrain || tr("Terrain à définir")}</h3>
          </div>
          <span style={styles.pill}>{poule.equipes.length}{tr(" \u00E9quipes")}</span>
        </div>

        <div className="tourneo-ranking-table" style={styles.tableWrap}>
          <table style={{ ...styles.table, minWidth: 520 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("\u00C9quipe")}</th>
                <th>{tr("MJ")}</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>{tr("Diff.")}</th>
                <th>{tr("Pts")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, index) => (<tr key={ligne.equipe.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div style={styles.teamCell}>
                      <TeamAvatar equipe={ligne.equipe} taille={34}/>
                      <strong>{ligne.equipe.nom}</strong>
                    </div>
                  </td>
                  <td>{ligne.mj}</td>
                  <td>{ligne.v}</td>
                  <td>{ligne.n}</td>
                  <td>{ligne.d}</td>
                  <td>{ligne.diff > 0 ? trModele("+{0}", ligne.diff) : ligne.diff}</td>
                  <td><strong>{ligne.pts}</strong></td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>);
    }
    function renduClassementElimination() {
        const matchsElimination = matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE);
        if (matchsElimination.length === 0)
            return null;
        const journeesElimination = [...new Set(matchsElimination.map((match) => match.journee))].sort((a, b) => a - b);
        const derniereJournee = journeesElimination[journeesElimination.length - 1];
        const finale = matchsElimination.find((match) => match.journee === derniereJournee);
        const finaleTerminee = tournoiEstTermine(formatTournoi, equipes, matchs, optionsV2, matchsValides) &&
            finale &&
            finale.score1 !== "" &&
            finale.score2 !== "" &&
            Number(finale.score1) !== Number(finale.score2);
        const championId = finaleTerminee
            ? Number(finale.score1) > Number(finale.score2)
                ? finale.equipe1Id
                : finale.equipe2Id
            : undefined;
        const finalisteId = finaleTerminee
            ? championId === finale.equipe1Id
                ? finale.equipe2Id
                : finale.equipe1Id
            : undefined;
        const groupes = journeesElimination
            .slice()
            .reverse()
            .map((journee) => {
            const matchsTour = matchsElimination.filter((match) => match.journee === journee);
            const perdants = matchsTour
                .filter((match) => match.score1 !== "" &&
                match.score2 !== "" &&
                Number(match.score1) !== Number(match.score2))
                .map((match) => Number(match.score1) > Number(match.score2)
                ? match.equipe2Id
                : match.equipe1Id)
                .filter((id) => id !== finalisteId);
            return {
                journee,
                titre: nomTourDepuisNombreMatchs(matchsTour.length),
                equipes: perdants.map((id) => trouverEquipe(id)).filter(Boolean),
            };
        })
            .filter((groupe) => groupe.equipes.length > 0);
        const champion = championId ? trouverEquipe(championId) : undefined;
        const finaliste = finalisteId ? trouverEquipe(finalisteId) : undefined;
        return (<section style={styles.card}>
        <div style={styles.formHeader}>
          <div>
            <span style={styles.eyebrow}>{tr("Parcours final")}</span>
            <h2 style={styles.sectionTitle}>{tr("Classement de l\u2019\u00E9limination")}</h2>
          </div>
          <span style={styles.pill}>{equipes.length}{tr(" participants")}</span>
        </div>

        <div style={styles.eliminationRanking}>
          {champion && (<div style={{ ...styles.eliminationRankRow, ...styles.eliminationRankWinner }}>
              <span style={styles.eliminationRank}>1</span>
              <TeamAvatar equipe={champion} taille={40}/>
              <strong>{champion.nom}</strong>
              <span style={styles.eliminationStatus}>{tr("Champion")}</span>
            </div>)}

          {finaliste && (<div style={styles.eliminationRankRow}>
              <span style={styles.eliminationRank}>2</span>
              <TeamAvatar equipe={finaliste} taille={40}/>
              <strong>{finaliste.nom}</strong>
              <span style={styles.eliminationStatus}>{tr("Finaliste")}</span>
            </div>)}

          {groupes.map((groupe) => (<div key={groupe.journee} style={styles.eliminationGroup}>
              <div style={styles.eliminationGroupTitle}>{tr("\u00C9limin\u00E9s en ")}{groupe.titre.toLowerCase()}</div>
              <div style={styles.eliminationGroupTeams}>
                {groupe.equipes.filter((equipe): equipe is Equipe => Boolean(equipe)).map((equipe) => (<div key={equipe.id} style={styles.eliminationChip}>
                    <TeamAvatar equipe={equipe} taille={30}/>
                    <span>{equipe.nom}</span>
                  </div>))}
              </div>
            </div>))}
        </div>
      </section>);
    }
    function renduResultatFinal() {
        const source = formatTournoi === "elimination" ? matchs : matchsFinale;
        if (source.length === 0) {
            return (<section style={styles.card}>
          <span style={styles.eyebrow}>{tr("Phase finale")}</span>
          <h2 style={styles.sectionTitle}>{tr("\u00C0 venir")}</h2>
          <p style={styles.muted}>{tr("La phase finale sera g\u00E9n\u00E9r\u00E9e automatiquement lorsque les conditions seront remplies.")}</p>
        </section>);
        }
        const derniereJournee = Math.max(...source.map((match) => match.journee));
        const finale = source.find((match) => match.journee === derniereJournee);
        if (!tournoiEstTermine(formatTournoi, equipes, matchs, optionsV2, matchsValides) || !finale || finale.score1 === "" || finale.score2 === "" || Number(finale.score1) === Number(finale.score2)) {
            return (<section style={styles.card}>
          <span style={styles.eyebrow}>{tr("Phase finale")}</span>
          <h2 style={styles.sectionTitle}>{tr("Tournoi en cours")}</h2>
          <p style={styles.muted}>{tr("Le champion appara\u00EEtra ici d\u00E8s que la finale sera termin\u00E9e.")}</p>
        </section>);
        }
        const equipe1 = trouverEquipe(finale.equipe1Id);
        const equipe2 = trouverEquipe(finale.equipe2Id);
        if (!equipe1 || !equipe2)
            return null;
        const gagnant = Number(finale.score1) > Number(finale.score2) ? equipe1 : equipe2;
        const finaliste = Number(finale.score1) > Number(finale.score2) ? equipe2 : equipe1;
        return (<section style={styles.card}>
        <span style={styles.eyebrow}>{tr("R\u00E9sultat final")}</span>
        <h2 style={styles.sectionTitle}>{tr("Champion de ")}{nomTournoi}</h2>
        <div style={styles.finalResult}>
          <div style={styles.finalistCard}>
            <TeamAvatar equipe={finaliste} taille={58}/>
            <span style={styles.muted}>{tr("Finaliste")}</span>
            <strong style={styles.finalName}>{finaliste.nom}</strong>
          </div>
          <div style={styles.championCard}>
            <div style={styles.championLabel}>{tr("CHAMPION")}</div>
            <TeamAvatar equipe={gagnant} taille={74}/>
            <strong style={styles.championName}>{gagnant.nom}</strong>
          </div>
        </div>
      </section>);
    }
    useEffect(() => {
        if (!tournoiId || !userId || !matchs.length)
            return;
        if (!tournoiEstTermine(formatTournoi, equipes, matchs, optionsV2, matchsValides))
            return;
        async function synchroniserPalmares() {
            const ids = equipes.map((equipe) => equipe.profilId ?? equipe.id).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
            if (!ids.length)
                return;
            const { data: profils } = await supabase.rpc("tourneo_profils_publics", { p_ids: ids }).select("id");
            if (!Array.isArray(profils) || !profils.length)
                return;
            const profilsIds = new Set(profils.map((profil) => profil.id));
            const rangElimination = (equipeId: string) => {
                if (!(formatTournoi === "elimination" || formatTournoi === "poulesFinale")) {
                    const index = classement.findIndex((ligne) => ligne.equipe.id === equipeId);
                    return index >= 0 ? index + 1 : equipes.length;
                }
                const matchsFinaux = formatTournoi === "poulesFinale"
                    ? matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE)
                    : matchs;
                if (!matchsFinaux.length)
                    return equipes.length;
                const derniereJournee = Math.max(...matchsFinaux.map((match) => match.journee));
                const finale = matchsFinaux.find((match) => match.journee === derniereJournee);
                if (finale && finale.score1 !== "" && finale.score2 !== "") {
                    const gagnant = Number(finale.score1) > Number(finale.score2) ? finale.equipe1Id : finale.equipe2Id;
                    const finaliste = gagnant === finale.equipe1Id ? finale.equipe2Id : finale.equipe1Id;
                    if (equipeId === gagnant)
                        return 1;
                    if (equipeId === finaliste)
                        return 2;
                }
                const dernierMatch = [...matchsFinaux]
                    .filter((match) => match.equipe1Id === equipeId || match.equipe2Id === equipeId)
                    .sort((a, b) => b.journee - a.journee)[0];
                if (!dernierMatch)
                    return equipes.length;
                const matchsDuTour = matchsFinaux.filter((match) => match.journee === dernierMatch.journee).length;
                return matchsDuTour + 1;
            };
            const lignes = equipes
                .filter((equipe) => profilsIds.has(equipe.profilId ?? equipe.id))
                .map((equipe) => {
                const placement = rangElimination(equipe.id);
                return {
                    tournament_id: tournoiId,
                    profile_id: equipe.profilId ?? equipe.id,
                    tournament_name: nomTournoi,
                    sport,
                    placement,
                    points: pointsPourRang(placement),
                };
            });
            if (lignes.length) {
                await supabase.from("player_results").upsert(lignes, {
                    onConflict: "tournament_id,profile_id",
                });
            }
        }
        synchroniserPalmares();
    }, [tournoiId, userId, matchs, equipes, formatTournoi, classement, nomTournoi, sport, optionsV2]);
    if (!pret) {
        return (<main style={styles.page}>
        <div style={styles.loaderCard}>
          <LogoTourneo />
          <span style={styles.muted}>{tr("Chargement de votre tournoi\u2026")}</span>
        </div>
      </main>);
    }
    if (!cree) {
        return (<main style={styles.page}>
        <div style={styles.shell}>
          <TourneoNav active="tournoi" onLogout={seDeconnecter} primaryLabel={tr("Mes tournois")} primaryHref="/dashboard"/>

          <section className="tourneo-create-card" style={{ ...styles.formCard, maxWidth: 900, margin: "0 auto" }}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("Nouveau tournoi")}</span>
                <h1 style={{ ...styles.heroTitle, marginBottom: 8 }}>{tr("Cr\u00E9er votre tournoi")}</h1>
                <p style={styles.heroText}>{tr("Deux \u00E9tapes simples : configurez, puis ajoutez les participants.")}</p>
              </div>
              <span style={styles.pill}>{equipes.length}{tr(" participant(s)")}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: 6, borderRadius: 16, background: "#090E17", margin: "18px 0" }}>
              <button style={{ ...styles.ghostButton, ...(creationEtape === "configuration" ? styles.tabActive : {}) }} onClick={() => setCreationEtape("configuration")}>{tr("1 \u00B7 Configuration")}</button>
              <button style={{ ...styles.ghostButton, ...(creationEtape === "participants" ? styles.tabActive : {}) }} onClick={() => setCreationEtape("participants")}>{tr("2 \u00B7 Participants")}</button>
            </div>

            {creationEtape === "configuration" ? (<>
                <label style={styles.label}>{tr("Nom du tournoi")}</label>
                <input style={styles.input} value={nomTournoi} onChange={(event) => setNomTournoi(capitaliserNom(event.target.value))} placeholder={tr("Ex. Tournoi été 2026")}/>

                <div style={styles.twoColumns}>
                  <div>
                    <ChoixSport value={sport} onChange={changerSport} disabled={cree && !modificationParticipantsAutorisee}/>
                  </div>

                  <div>
                    <label style={styles.label}>{tr("Format")}</label>
                    <select style={styles.input} value={formatTournoi} disabled={cree && !modificationParticipantsAutorisee} onChange={(event) => setFormatTournoi(event.target.value as FormatTournoi)}>
                      {Object.entries(LIBELLES_FORMAT).map(([value, label]) => (<option value={value} key={value}>{tr(label)}</option>))}
                    </select>
                    <div style={styles.formatExplanation}>
                      <strong>{tr(LIBELLES_FORMAT[formatTournoi])}</strong>
                      <span>{tr(EXPLICATIONS_FORMAT[formatTournoi])}</span>
                    </div>
                  </div>
                </div>

                {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (<div style={styles.configBox}>
                    <label style={styles.label}>{tr("Organisation des poules")}</label>
                    <select style={styles.input} value={modePoules} onChange={(event) => setModePoules(event.target.value as ModePoules)}>
                      <option value="nombrePoules">{tr("Choisir le nombre de poules")}</option>
                      <option value="taillePoules">{tr("Choisir les participants par poule")}</option>
                    </select>

                    <div style={styles.twoColumns}>
                      <div>
                        <label style={styles.label}>
                          {modePoules === "nombrePoules" ? tr("Nombre de poules") : tr("Participants par poule")}
                        </label>
                        <input style={styles.input} type="number" min="2" value={modePoules === "nombrePoules" ? nombrePoules : taillePoules} onChange={(event) => modePoules === "nombrePoules"
                        ? setNombrePoules(Number(event.target.value))
                        : setTaillePoules(Number(event.target.value))}/>
                      </div>
                      {formatTournoi === "poulesFinale" && (<div>
                          <label style={styles.label}>{tr("Qualifi\u00E9s par poule")}</label>
                          <input style={styles.input} type="number" min="1" value={qualifiesParPoule} onChange={(event) => setQualifiesParPoule(Number(event.target.value))}/>
                        </div>)}
                    </div>
                  </div>)}

                <OptionsTournoiV2 value={optionsV2} onChange={setOptionsV2}/>
                <button style={styles.primaryButton} onClick={() => setCreationEtape("participants")}>{tr("Continuer vers les participants \u2192")}</button>
              </>) : (<>
                <div className="tourneo-participants-header-mobile" style={styles.participantsHeader}>
                  <div>
                    <span style={styles.eyebrow}>{tr("Participants")}</span>
                    <h2 style={styles.sectionTitle}>{tr("\u00C9quipes / joueurs")}</h2>
                  </div>
                </div>

                <button className="tourneo-add-player-main" style={styles.primaryButton} onClick={() => {
                    setEquipeAModifier(null);
                    setModalOuvert(true);
                }}>{tr("+ Ajouter un joueur sans profil")}</button>

                <details className="tourneo-optional-panel"><summary>{tr("Importer une liste de participants")}</summary>
                <label style={{ ...styles.secondaryButton, display: "block", cursor: "pointer" }}>{tr("Importer des participants (Excel / CSV / texte)")}<input type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" disabled={importEnCours} onChange={importerParticipants} style={{ display: "block", marginTop: 8 }}/>
                  <small>{tr("Excel .xlsx : premi\u00E8re feuille, colonne Nom ou premi\u00E8re colonne. CSV/texte : un nom par ligne. 500 Ko et 256 participants maximum. Doublons ignor\u00E9s.")}</small>
                </label>

                {tr(messageImport) && <p role="status" style={styles.selfAddHint}>{tr(messageImport)}</p>}
                {nomsImportes.length > 0 && <div style={{ padding: 14, border: "1px solid #475579", borderRadius: 14 }}>
                  <p>{tr("Aper\u00E7u : ")}{nomsImportes.slice(0, 8).join(" · ")}{nomsImportes.length > 8 ? "…" : ""}</p>
                  <button type="button" style={styles.secondaryButton} disabled={importEnCours || !modificationParticipantsAutorisee} onClick={ajouterImport}>{tr("Ajouter cette liste au tournoi")}</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => { setNomsImportes([]); setMessageImport("Import annulé."); }}>{tr("Annuler l\u2019import")}</button>
                </div>}

</details>
                <div style={styles.selfAddLine}>
                  <span style={styles.selfAddHint}>{tr("Votre propre profil ?")}</span>
                  <button className="tourneo-add-self" style={styles.selfAddButton} disabled={ajoutMoiEnCours} onClick={ajouterMonProfil}>
                    {ajoutMoiEnCours ? tr("Ajout…") : tr("M’ajouter moi-même")}
                  </button>
                </div>

                <details className="tourneo-optional-panel"><summary>{tr("Ajouter un joueur avec son profil Tourneo")}</summary><div className="tourneo-player-profile-box" style={styles.playerCodeBox}>
                  <div style={{ display: "grid", gap: 5 }}>
                    
                    <span style={styles.muted}>{tr("Saisissez son code joueur ou scannez directement le QR affich\u00E9 sur son profil.")}</span>
                  </div>

                  <div style={styles.playerCodeActions}>
                    <input style={{ ...styles.input, margin: 0 }} value={codeJoueur} onChange={(event) => setCodeJoueur(event.target.value)} placeholder={tr("Ex. TRN-12AB-34CD")}/>
                    <button style={styles.secondaryButton} onClick={ajouterViaCodeTourneo}>{tr("Ajouter par code")}</button>
                  </div>

                  <button className="tourneo-scan-player" style={styles.scanButton} onClick={ouvrirScanner}>{tr("\u2317 Scanner le QR du joueur")}</button>

                  {tr(messageCodeJoueur) && <span style={styles.statusLine}>{tr(messageCodeJoueur)}</span>}
                </div></details>

                <div style={styles.teamList}>
                  {equipes.length === 0 ? (<div style={styles.emptyState}>{tr("Ajoutez au moins deux participants pour commencer.")}</div>) : (equipes.map((equipe) => (<TeamCard key={equipe.id} equipe={equipe} onModifier={() => {
                        setEquipeAModifier(equipe);
                        setModalOuvert(true);
                    }} onSupprimer={() => setEquipes((actuelles) => actuelles.filter((item) => item.id !== equipe.id))}/>)))}
                </div>

                <button style={styles.secondaryButton} disabled={operationTournoi} onClick={() => preparerSupport('inscriptions')}>{tournoiId ? tr("Gérer les inscriptions et le pointage") : tr("Préparer les inscriptions par lien / QR")}</button>
                <button style={styles.secondaryButton} disabled={operationTournoi} onClick={() => preparerSupport('affiche')}>{tr('Créer une affiche')}</button>
                <button style={styles.secondaryButton} disabled={operationTournoi} onClick={() => preparerSupport('arbitres')}>{tr('Désigner les arbitres')}</button>
                <button style={styles.primaryButton} disabled={operationTournoi} onClick={lancerTournoi}>{operationTournoi ? tr("Enregistrement…") : tr("Démarrer le tournoi")}</button>
                <div style={{ marginTop: 12 }}><TourneoRetour onClick={() => setCreationEtape("configuration")}>{tr("Configuration du tournoi")}</TourneoRetour></div>
                {tr(messageCloud) && <div style={styles.statusLine}>{tr(messageCloud)}</div>}
              </>)}
          </section>
        </div>

        {scannerOuvert && (<div style={styles.modalBackdrop} onClick={fermerScanner}>
            <section style={styles.scannerModal} onClick={(event) => event.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <span style={styles.eyebrow}>{tr("Profil Tourneo")}</span>
                  <h2 style={styles.sectionTitle}>{tr("Scanner le QR joueur")}</h2>
                </div>
                <button style={styles.modalClose} onClick={fermerScanner}>×</button>
              </div>
              <div style={styles.scannerViewport}>
                <video ref={videoScannerRef} playsInline muted style={styles.scannerVideo}/>
                <div style={styles.scannerFrame}/>
              </div>
              <p style={styles.scannerHelp}>{tr("Placez le QR personnel du joueur au centre.")}</p>
              {tr(scannerMessage) && <div style={styles.inlineWarning}>{tr(scannerMessage)}</div>}
              <button style={styles.ghostWide} onClick={fermerScanner}>{tr("Annuler")}</button>
            </section>
          </div>)}

        <TeamModal ouvert={modalOuvert} equipeAModifier={equipeAModifier} onFermer={() => {
                setModalOuvert(false);
                setEquipeAModifier(null);
            }} onAjouter={enregistrerEquipe}/>
      </main>);
    }
    return (<main style={styles.page}>

      <style jsx global>{`
        @media (max-width: 760px) {
          .tourneo-creation-mobile-fix { grid-template-columns: 1fr !important; }
          input, select, button { max-width: 100%; }

          main { padding-bottom: 118px !important; }

          .tourneo-create-card {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .tourneo-create-card h1 {
            font-size: 38px !important;
            line-height: 1.02 !important;
          }

          .tourneo-create-card .tourneo-participants-header-mobile {
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 8px !important;
          }

          .tourneo-tournament-header {
            padding: 22px 0 16px !important;
            gap: 14px !important;
          }

          .tourneo-tournament-header h1 {
            font-size: 40px !important;
            line-height: 1 !important;
          }

          .tourneo-header-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 8px !important;
          }

          .tourneo-header-actions button {
            width: 100% !important;
            padding: 10px 8px !important;
            font-size: 12px !important;
          }

          .tourneo-progress-card {
            border-radius: 18px !important;
          }


          .tourneo-tabs {
            position: sticky !important;
            top: 8px !important;
            z-index: 30 !important;
          }

          .tourneo-player-profile-box {
            padding: 14px !important;
            gap: 10px !important;
          }

          .tourneo-create-card .tourneo-add-player-main {
            width: 100% !important;
            min-height: 56px !important;
            margin-top: 14px !important;
            padding: 14px 16px !important;
            font-size: 16px !important;
          }

          .tourneo-create-card .tourneo-add-self {
            width: auto !important;
            min-height: 0 !important;
            padding: 5px 8px !important;
            font-size: 10px !important;
            border-radius: 999px !important;
            box-shadow: none !important;
          }

          .tourneo-create-card .tourneo-player-profile-box {
            padding: 12px !important;
            gap: 9px !important;
          }

          .tourneo-create-card .tourneo-scan-player {
            width: 100% !important;
          }

          .tourneo-score-actions {
            justify-content: space-between !important;
            align-items: center !important;
          }

          .tourneo-score-actions button {
            padding: 8px 10px !important;
            font-size: 12px !important;
          }

          .tourneo-podium-stage {
            grid-template-columns: repeat(3, minmax(0,1fr)) !important;
            gap: 7px !important;
            overflow: hidden !important;
            padding: 8px 0 0 !important;
            margin-top: 18px !important;
          }

          .tourneo-podium-stage > div {
            min-width: 0 !important;
            transform: none !important;
          }

          .tourneo-podium-stage > div > div:first-child {
            margin: 0 2px 7px !important;
            padding: 10px 5px 10px !important;
            border-radius: 16px !important;
            gap: 5px !important;
          }

          .tourneo-podium-stage img {
            max-width: 54px !important;
            max-height: 54px !important;
          }

          .tourneo-ranking-table {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            margin-left: -4px !important;
            margin-right: -4px !important;
            padding-bottom: 3px !important;
          }

          .tourneo-ranking-table table {
            min-width: 600px !important;
            font-size: 12px !important;
          }

          .tourneo-souvenir-modal {
            width: calc(100vw - 16px) !important;
            max-width: calc(100vw - 16px) !important;
            max-height: calc(100vh - 16px) !important;
            padding: 14px !important;
            border-radius: 20px !important;
          }

          .tourneo-souvenir-poster {
            display: block !important;
            aspect-ratio: auto !important;
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .tourneo-souvenir-right {
            margin-top: 18px !important;
          }

          .tourneo-souvenir-podium {
            margin-top: 18px !important;
          }

          .tourneo-souvenir-footer {
            grid-template-columns: 108px minmax(0,1fr) !important;
            gap: 12px !important;
            align-items: start !important;
          }

          .tourneo-souvenir-footer svg {
            width: 88px !important;
            height: 88px !important;
          }

          .tourneo-souvenir-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            margin-bottom: 112px !important;
          }

          .tourneo-souvenir-actions button {
            width: 100% !important;
            margin-top: 0 !important;
          }
        }

        @media (min-width: 900px) {
          .tourneo-souvenir-modal {
            width: min(1080px, calc(100vw - 36px)) !important;
            max-height: calc(100vh - 24px) !important;
            overflow-y: auto !important;
            padding: 16px !important;
          }

          .tourneo-souvenir-poster {
            display: grid !important;
            grid-template-columns: minmax(0, 1.34fr) minmax(340px, .66fr) !important;
            grid-template-rows: auto minmax(0, 1fr) !important;
            grid-template-areas:
              "brand right"
              "photo right" !important;
            column-gap: 24px !important;
            row-gap: 14px !important;
            aspect-ratio: 16 / 9 !important;
            min-height: 0 !important;
            padding: 22px !important;
          }

          .tourneo-souvenir-brand {
            grid-area: brand !important;
          }

          .tourneo-souvenir-photo-zone {
            grid-area: photo !important;
            margin-top: 0 !important;
            height: 100% !important;
            min-height: 0 !important;
          }

          .tourneo-souvenir-photo-zone img {
            height: 100% !important;
            min-height: 0 !important;
          }

          .tourneo-souvenir-right {
            grid-area: right !important;
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
            height: 100% !important;
          }

          .tourneo-souvenir-podium {
            margin-top: 22px !important;
            padding-top: 0 !important;
          }

          .tourneo-souvenir-footer {
            margin-top: auto !important;
            padding-top: 16px !important;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #06101C !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .tourneo-mobile-bottom-nav,
          .tourneo-mobile-more,
          .tourneo-souvenir-actions,
          .tourneo-souvenir-modal > div:first-child,
          .tourneo-souvenir-modal > button {
            display: none !important;
          }

          #tourneo-souvenir,
          #tourneo-souvenir * {
            visibility: visible !important;
          }

          #tourneo-souvenir {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            border-radius: 0 !important;
            display: grid !important;
            grid-template-columns: 1.34fr .66fr !important;
            grid-template-rows: auto 1fr !important;
            grid-template-areas:
              "brand right"
              "photo right" !important;
            gap: 8mm !important;
            padding: 10mm !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: radial-gradient(circle at 18% 0%,rgba(124,92,255,.28),transparent 30%),radial-gradient(circle at 90% 12%,rgba(34,211,238,.18),transparent 28%),linear-gradient(145deg,#06101C,#0D1830 58%,#101A2D) !important;
          }

          .tourneo-souvenir-brand { grid-area: brand !important; }
          .tourneo-souvenir-photo-zone {
            grid-area: photo !important;
            margin-top: 0 !important;
            height: 100% !important;
          }
          .tourneo-souvenir-photo-zone img {
            height: 100% !important;
            object-fit: cover !important;
          }
          .tourneo-souvenir-right {
            grid-area: right !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .tourneo-souvenir-footer {
            margin-top: auto !important;
          }
        }
      `}</style>
      <div style={styles.shell}>
        <TourneoNav active="tournoi" onLogout={seDeconnecter}/>

        <section className="tourneo-tournament-header" style={styles.tournamentHeader}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.metaRow}>
              <span style={styles.formatBadge}>{tr(LIBELLES_FORMAT[formatTournoi])}</span>
              <span style={styles.metaText}>{tr(LIBELLES_SPORT[sport]) ?? sport}</span>
            </div>
            <h1 style={styles.tournamentTitle}>{nomTournoi}</h1>
            <p style={styles.tournamentSubtitle}>
              {equipes.length}{tr(" participants \u00B7 ")}{joues}/{totalMatchsTheorique || matchs.length}{tr(" matchs termin\u00E9s")}</p>
            {tr(messageCloud) && <div style={styles.syncBadge}><span style={styles.syncDot}/>{tr(messageCloud)}</div>}
            {conflitCloud && <section className="tourneo-sync-conflict" aria-label={tr("Comparer les versions")} role="status"><strong>{tr("Une autre version existe en ligne")}</strong><p>{tr("Cette copie contient ")}{matchsValides.length}{tr(" r\u00E9sultat(s) valid\u00E9(s). La version en ligne en contient ")}{Array.isArray(conflitCloud.donnees?.matchsValides) ? conflitCloud.donnees.matchsValides.length : 0}{tr(". Aucun remplacement automatique n\u2019a \u00E9t\u00E9 fait.")}</p><div><button type="button" onClick={sauvegarderFichier}>{tr("T\u00E9l\u00E9charger ma copie locale")}</button><button type="button" onClick={() => {
                if (!window.confirm("Charger la version en ligne ? Une sauvegarde de cette copie locale sera téléchargée avant le rechargement."))
                    return;
                sauvegarderFichier();
                suspendreSync.current = true;
                localStorage.removeItem(pendingKey);
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(revisionKey);
                window.location.reload();
            }}>{tr("Charger la version en ligne")}</button><button type="button" onClick={() => {
                if (!window.confirm("Publier cette copie locale à la place de la version en ligne ? Les résultats de l’autre version seront remplacés."))
                    return;
                revisionCloud.current = conflitCloud.revision;
                setConflitCloud(null);
                setRevisionConnexion(v => v + 1);
            }}>{tr("Publier cette copie locale")}</button></div></section>}
          </div>

          <div className="tourneo-header-actions" style={styles.headerActions}>
            <button style={styles.secondaryButton} onClick={partagerTournoi}>{tr("Partager")}</button>
            <a className="tourneo-header-tool-link" href="/outils">{tr("Outils arbitre")}</a>
            <details className="tourneo-tournament-more"><summary>{tr("G\u00E9rer le tournoi")}</summary><div>
            <button style={styles.secondaryButton} onClick={() => { window.location.href = `/tournoi/${tournoiId}/inscriptions`; }}>{tr("Inscriptions / pointage")}</button>
            <button style={styles.secondaryButton} onClick={() => setQrOuvert(true)}>{tr("QR code")}</button>
            <button style={styles.secondaryButton} disabled={operationTournoi} onClick={() => preparerSupport('affiche')}>{tr('Créer une affiche')}</button>
            <button style={styles.secondaryButton} onClick={exporterPDF}>{tr("Imprimer / PDF")}</button>
            <button style={styles.secondaryButton} onClick={exporterClassement}>{tr("Classement CSV")}</button>
            <button style={styles.secondaryButton} onClick={sauvegarderFichier}>{tr("Sauvegarder les r\u00E9sultats")}</button>
            <label style={styles.secondaryButton}>{tr("Restaurer une sauvegarde")}<input type="file" accept=".json,application/json" onChange={restaurerFichier} style={{ maxWidth: 180, display: "block", fontSize: 11, marginTop: 6 }}/></label>
            <button style={styles.secondaryButton} onClick={() => setOnglet("participants")}>{tr("Modifier les \u00E9quipes")}</button>
            <button style={styles.primarySmall} onClick={() => (window.location.href = "/tournoi/nouveau")}>{tr("Nouveau tournoi")}</button>
            <a href="/guides/outils-et-olympiades">{tr("Guide des outils et des Olympiades")}</a>
            </div></details>
          </div>
        </section>

        <section className="tourneo-progress-card" style={styles.progressCard}>
          <div style={styles.progressTop}>
            <div>
              <span style={styles.eyebrow}>{tr("Progression")}</span>
              <strong style={styles.progressTitle}>{progression}{tr("% termin\u00E9")}</strong>
            </div>
            <span style={styles.progressNumbers}>{joues} / {totalMatchsTheorique || matchs.length}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${progression}%` }}/>
          </div>
        </section>

        <nav className="tourneo-tabs" style={styles.nav}>
          {([
            ["matchs", "Matchs"],
            ["classement", "Classement"],
            ["statistiques", "Statistiques"],
            ["arbitrage", "Arbitrage"],
            ["photos", "Photos"],
        ] as [
            Onglet,
            string
        ][]).map(([value, label]) => (<button key={value} style={{ ...styles.tab, ...(onglet === value ? styles.tabActive : {}) }} onClick={() => setOnglet(value)}>
              {tr(label)}
            </button>))}
        </nav>

        {onglet === "participants" && (<section style={styles.card}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("Configuration")}</span>
                <h2 style={styles.sectionTitle}>{tr("Modifier le tournoi")}</h2>
                <p style={styles.muted}>{modificationParticipantsAutorisee ? tr("Composition et règles modifiables avant le premier résultat.") : tr("Corrigez les noms et les membres des équipes. Les places, résultats et rencontres sont conservés.")}</p>
              </div>
              <button style={styles.ghostButton} onClick={() => setOnglet("matchs")}>{tr("Fermer")}</button>
            </div>

            <fieldset disabled={!modificationParticipantsAutorisee} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <OptionsTournoiV2 value={optionsV2} onChange={setOptionsV2} disabled={!modificationParticipantsAutorisee}/>
            <div style={styles.twoColumns}>
              <div>
                <label style={styles.label}>{tr("Format")}</label>
                <select style={styles.input} value={formatTournoi} disabled={cree && !modificationParticipantsAutorisee} onChange={(event) => {
                setFormatTournoi(event.target.value as FormatTournoi);
                setMatchs([]);
                setPoules([]);
            }}>
                  {Object.entries(LIBELLES_FORMAT).map(([value, label]) => (<option key={value} value={value}>{tr(label)}</option>))}
                </select>
              </div>

              <div>
                <ChoixSport value={sport} onChange={changerSport} disabled={cree && !modificationParticipantsAutorisee}/>
              </div>
            </div>

            {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (<div style={styles.configBox}>
                <label style={styles.label}>{tr("Organisation des poules")}</label>
                <select style={styles.input} value={modePoules} onChange={(event) => setModePoules(event.target.value as ModePoules)}>
                  <option value="nombrePoules">{tr("Choisir le nombre de poules")}</option>
                  <option value="taillePoules">{tr("Choisir les participants par poule")}</option>
                </select>
                <div style={styles.twoColumns}>
                  <div>
                    <label style={styles.label}>{modePoules === "nombrePoules" ? tr("Nombre de poules") : tr("Participants par poule")}</label>
                    <input style={styles.input} type="number" min="2" value={modePoules === "nombrePoules" ? nombrePoules : taillePoules} onChange={(event) => modePoules === "nombrePoules"
                    ? setNombrePoules(Number(event.target.value))
                    : setTaillePoules(Number(event.target.value))}/>
                  </div>
                  {formatTournoi === "poulesFinale" && (<div>
                      <label style={styles.label}>{tr("Qualifi\u00E9s par poule")}</label>
                      <input style={styles.input} type="number" min="1" value={qualifiesParPoule} onChange={(event) => setQualifiesParPoule(Number(event.target.value))}/>
                    </div>)}
                </div>
              </div>)}

            <div style={styles.participantsHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("Participants")}</span>
                <h3 style={styles.smallTitle}>{equipes.length}{tr(" \u00E9quipe(s) / joueur(s)")}</h3>
              </div>
              <button style={styles.secondaryButton} onClick={() => {
                setEquipeAModifier(null);
                setModalOuvert(true);
            }}>{tr("Ajouter")}</button>
            </div>

            <details className="tourneo-optional-panel"><summary>{tr("Ajouter un joueur avec son profil Tourneo")}</summary><div className="tourneo-player-profile-box" style={styles.playerCodeBox}>
              
              <span style={styles.muted}>{tr("Par code joueur ou en scannant son QR personnel.")}</span>
              <div style={styles.playerCodeActions}>
                <input style={{ ...styles.input, margin: 0 }} value={codeJoueur} onChange={(event) => setCodeJoueur(event.target.value)} placeholder={tr("Code joueur")}/>
                <button style={styles.secondaryButton} onClick={ajouterViaCodeTourneo}>{tr("Ajouter par code")}</button>
              </div>
              <button style={styles.scanButton} onClick={ouvrirScanner}>{tr("\u2317 Scanner le QR du joueur")}</button>
              {tr(messageCodeJoueur) && <span style={styles.statusLine}>{tr(messageCodeJoueur)}</span>}
            </div></details>

            </fieldset>
            <div style={styles.teamList}>
              {equipes.map((equipe) => (<TeamCard key={equipe.id} equipe={equipe} suppressionAutorisee={modificationParticipantsAutorisee} onModifier={() => {
                    setEquipeAModifier(equipe);
                    setModalOuvert(true);
                }} onSupprimer={() => {
                    if (!modificationParticipantsAutorisee)
                        return;
                    setEquipes((actuelles) => actuelles.filter((item) => item.id !== equipe.id));
                    setMatchs([]);
                    setPoules([]);
                }}/>))}
            </div>

            <button disabled={!modificationParticipantsAutorisee} style={styles.primaryButton} onClick={recalculerTournoi}>{tr("Enregistrer et recalculer")}</button>
            <button style={styles.dangerButton} onClick={supprimerTournoi}>{tr("Supprimer ce tournoi")}</button>
          </section>)}

        {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && poules.length > 0 && onglet === "matchs" && (<section style={styles.card}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("R\u00E9partition")}</span>
                <h2 style={styles.sectionTitle}>{tr("Poules")}</h2>
              </div>
              <span style={styles.pill}>{poules.length}{tr(" poules")}</span>
            </div>

            <div style={styles.poolGrid}>
              {poules.map((poule) => (<div key={poule.id} style={styles.poolCard}>
                  <div style={styles.poolHeader}>
                    <strong style={styles.poolTitle}>{poule.nom}</strong>
                    <span style={styles.pill}>{poule.equipes.length}</span>
                  </div>

                  {modificationParticipantsAutorisee ? (<input style={{ ...styles.input, marginBottom: 14 }} placeholder={tr("Terrain / table / piste")} value={poule.terrain} onChange={(event) => {
                        const terrain = event.target.value;
                        setPoules((actuelles) => actuelles.map((item) => item.id === poule.id ? { ...item, terrain } : item));
                    }}/>) : poule.terrain ? (<span style={styles.terrainLabel}>{poule.terrain}</span>) : null}

                  <div style={styles.poolTeams}>
                    {poule.equipes.map((equipe) => (<div key={equipe.id} style={styles.poolTeam}>
                        <TeamAvatar equipe={equipe} taille={32}/>
                        <strong>{equipe.nom}</strong>
                      </div>))}
                  </div>
                </div>))}
            </div>
          </section>)}

        {onglet === "matchs" && <div className="tourneo-referee-shortcut"><div><strong>{tr('Arbitres et résultats proposés')}</strong><p>{tr('Désignez les arbitres du tournoi et vérifiez leurs transferts.')}</p></div><button type="button" onClick={() => setOnglet('arbitrage')}>{tr('Gérer les arbitres')}</button></div>}
        {onglet === "matchs" && <ReglesSport key={sport} sport={sport}/>}
        {onglet === "matchs" && <PlanningTournoi tournoiId={tournoiId} equipes={equipes} matchs={matchs} options={optionsV2} onChange={setMatchs} valides={matchsValides} titreTour={titreJournee} detailsTour={journee => optionsV2.exemptions.filter(e => e.ronde === journee).map(e => <p key={e.id} style={styles.muted}>{tr("Exempt : ")}{trouverEquipe(e.id)?.nom} (+{optionsV2.pointsVictoire}{tr(" pts)")}</p>)} renderMatch={(match, reperes) => {
                const equipe1 = trouverEquipe(match.equipe1Id);
                const equipe2 = trouverEquipe(match.equipe2Id);
                const pouleDuMatch = poules.find((poule) => poule.equipes.some((equipe) => equipe.id === match.equipe1Id) &&
                    poule.equipes.some((equipe) => equipe.id === match.equipe2Id));
                const libelleBranche = match.branche === "repechage" ? "Repêchage" : match.branche === "consolante" ? "Consolante" : match.branche === "finale" ? "Finale" : "Tableau principal";
                const fini = match.score1 !== "" && match.score2 !== "";
                const nulInterdit = fini &&
                    Number(match.score1) === Number(match.score2) &&
                    (formatParcours || formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE);
                const editable = scoreModifiable(match);
                return <>
                      {pouleDuMatch && match.id < SEUIL_PHASE_FINALE && (<div style={styles.matchMeta}>
                          <span>{pouleDuMatch.nom}</span>
                          {pouleDuMatch.terrain && <span>{pouleDuMatch.terrain}</span>}
                        </div>)}

                      <div className="tourneo-unified-score-grid" style={styles.matchGrid}>
                        <div style={styles.teamLeft}>
                          {equipe1 && <TeamAvatar equipe={equipe1} taille={38}/>}
                          <div className="tourneo-score-team-label"><strong>{equipe1?.nom ?? tr("Participant supprimé")}</strong><RepereParticipant id={match.equipe1Id} reperes={reperes}/></div>
                        </div>

                        <input style={{ ...styles.scoreInput, ...(editable ? {} : styles.scoreLocked) }} type="number" aria-label={trModele("Score de {0}", equipe1?.nom ?? "participant 1")} min="0" value={match.score1} disabled={!editable || optionsV2.score === "sets"} onChange={(event) => changerScore(match.id, "score1", event.target.value)}/>

                        <span style={styles.scoreSeparator}>–</span>

                        <input style={{ ...styles.scoreInput, ...(editable ? {} : styles.scoreLocked) }} type="number" aria-label={trModele("Score de {0}", equipe2?.nom ?? "participant 2")} min="0" value={match.score2} disabled={!editable || optionsV2.score === "sets"} onChange={(event) => changerScore(match.id, "score2", event.target.value)}/>

                        <div style={styles.teamRight}>
                          <div className="tourneo-score-team-label"><strong>{equipe2?.nom ?? tr("Participant supprimé")}</strong><RepereParticipant id={match.equipe2Id} reperes={reperes}/></div>
                          {equipe2 && <TeamAvatar equipe={equipe2} taille={38}/>}
                        </div>
                      </div>

                      {match.branche && <div style={styles.matchMeta}>{libelleBranche}</div>}
                      {optionsV2.score === "sets" && <SaisieManches match={match} gagnantes={optionsV2.setsGagnants} disabled={!editable} onChange={manches => changerManches(match, manches)}/>}
                      {nulInterdit && <div style={styles.inlineWarning}>{tr("Un vainqueur est requis pour poursuivre la phase finale.")}</div>}
                      {!matchsValides.includes(match.id) && <div className="tourneo-score-actions"><button type="button" disabled={match.score1 === "" || match.score2 === ""} style={styles.secondaryButton} onClick={() => validerScore(match)}>{tr("Valider ce résultat")}</button></div>}
                      {matchsValides.includes(match.id) && (<div className="tourneo-score-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <span style={{ ...styles.pill, color: "#9EF4C5" }}>{tr("Enregistr\u00E9")}</span>
                          <button style={styles.ghostButton} onClick={() => corrigerScore(match)}>{tr("Modifier le r\u00E9sultat")}</button>
                        </div>)}
            </>;
            }}/>}

        {formatParcours && <section style={styles.card}><h2 style={styles.sectionTitle}>{parcoursTermine(formatParcours, equipes, matchs) ? trModele("Vainqueur : {0}", classement[0]?.equipe.nom ?? "") : tr("Tournoi en cours")}</h2><p style={styles.muted}>{tr("Les tours suivants sont g\u00E9n\u00E9r\u00E9s apr\u00E8s validation de tous les matchs. Les exemptions avancent automatiquement. Le classement devient d\u00E9finitif \u00E0 la fin du tournoi.")}</p></section>}

        {onglet === "classement" && (<>
            {(formatTournoi === "complet" || formatTournoi === "allerRetour" || formatTournoi === "suisse" || formatTournoi === "rotation" || Boolean(formatParcours)) && (<>
                {podium.length >= 3 && (<section style={styles.card}>
                    <span style={styles.eyebrow}>{tournoiEstTermine(formatTournoi, equipes, matchs, optionsV2, matchsValides) ? tr("Résultat") : tr("Classement provisoire")}</span>
                    <h2 style={styles.sectionTitle}>{tr("Podium")}</h2>
                    <div className="tourneo-podium-stage" style={styles.podiumStage}>
                      {[podium[1], podium[0], podium[2]].map((ligne, index) => {
                        const rang = index === 0 ? 2 : index === 1 ? 1 : 3;
                        const hauteur = rang === 1 ? 150 : rang === 2 ? 118 : 96;
                        const medaille = rang === 1 ? "🥇" : rang === 2 ? "🥈" : "🥉";
                        return (<div key={ligne.equipe.id} style={{
                                ...styles.podiumColumn,
                                ...(rang === 1 ? styles.podiumColumnFirst : {}),
                            }}>
                            <div style={{
                                ...styles.podiumPlayer,
                                ...(rang === 1 ? styles.podiumPlayerFirst : {}),
                            }}>
                              <span style={styles.podiumRankBadge}>{rang}</span>
                              <span style={styles.podiumMedal}>{medaille}</span>
                              <TeamAvatar equipe={ligne.equipe} taille={rang === 1 ? 78 : 64}/>
                              <strong style={styles.finalName}>{ligne.equipe.nom}</strong>
                              <span style={styles.podiumScore}>{ligne.pts}{tr(" pts")}</span>
                            </div>

                            <div style={{
                                ...styles.podiumBlock,
                                minHeight: hauteur,
                                ...(rang === 1
                                    ? styles.podiumBlockFirst
                                    : rang === 2
                                        ? styles.podiumBlockSecond
                                        : styles.podiumBlockThird),
                            }}>
                              <strong style={styles.podiumPlace}>{rang}</strong>
                              <span style={styles.podiumPlaceLabel}>
                                {rang === 1 ? tr("Champion") : trModele("{0}e place", rang)}
                              </span>
                            </div>
                          </div>);
                    })}
                    </div>
                    <button style={{ ...styles.primaryButton, marginTop: 16 }} disabled={operationTournoi} onClick={() => preparerSupport('affiche')}>{tr('Créer l’affiche des résultats')}</button>
                    <button style={{ ...styles.secondaryButton, marginTop: 16 }} onClick={() => setSouvenirOuvert(true)}>{tr("Cr\u00E9er l\u2019affiche souvenir")}</button>
                  </section>)}

                <section style={styles.card}>
                  <div style={styles.formHeader}>
                    <div>
                      <span style={styles.eyebrow}>{tr("Classement g\u00E9n\u00E9ral")}</span>
                      <h2 style={styles.sectionTitle}>{tr("Tableau")}</h2>
                    </div>
                    <span style={styles.pill}>{equipes.length}{tr(" participants")}</span>
                  </div>
                  <div className="tourneo-ranking-table" style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th><th>{tr("\u00C9quipe")}</th><th>{tr("MJ")}</th><th>V</th><th>N</th><th>D</th><th>{tr("Diff.")}</th><th>{tr("Pts")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classement.map((ligne, index) => (<tr key={ligne.equipe.id}>
                            <td><strong>{index + 1}</strong></td>
                            <td><div style={styles.teamCell}><TeamAvatar equipe={ligne.equipe} taille={34}/><strong>{ligne.equipe.nom}</strong></div></td>
                            <td>{ligne.mj}</td><td>{ligne.v}</td><td>{ligne.n}</td><td>{ligne.d}</td>
                            <td>{ligne.diff > 0 ? trModele("+{0}", ligne.diff) : ligne.diff}</td><td><strong>{ligne.pts}</strong></td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>)}

            {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (<>
                {formatTournoi === "poulesFinale" && renduResultatFinal()}
                <section style={styles.card}>
                  <span style={styles.eyebrow}>{tr("Classements")}</span>
                  <h2 style={styles.sectionTitle}>{tr("Poules")}</h2>
                  <div style={styles.poolGrid}>{poules.map(renduClassementPoule)}</div>
                </section>
              </>)}

            {formatTournoi === "elimination" && (<>
                {renduResultatFinal()}
                {renduClassementElimination()}
              </>)}
          </>)}

        {onglet === "arbitrage" && <ArbitresTournoi id={tournoiId} equipes={equipes} matchs={matchs} valides={matchsValides} onImporter={(id, score1, score2, manches) => { setMatchs(actuels => actuels.map(m => m.id === id && !matchsValides.includes(id) ? { ...m, score1, score2, manches } : m)); setOnglet("matchs"); setTimeout(() => document.getElementById(`match-${id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),100); }}/>}

        {onglet === "photos" && <AlbumTournoi id={tournoiId} userId={userId || ""}/>}

        {onglet === "statistiques" && (<>
            <section style={styles.statsGrid}>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>{tr("Participants")}</span>
                <strong style={styles.metricValue}>{equipes.length}</strong>
                <span style={styles.metricHint}>{tr(LIBELLES_SPORT[sport]) ?? sport}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>{tr("Matchs termin\u00E9s")}</span>
                <strong style={styles.metricValue}>{joues}</strong>
                <span style={styles.metricHint}>{tr("sur ")}{totalMatchsTheorique || matchs.length}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>{tr("Progression")}</span>
                <strong style={styles.metricValue}>{progression}%</strong>
                <span style={styles.metricHint}>{tr(LIBELLES_FORMAT[formatTournoi])}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>{tr("Phase actuelle")}</span>
                <strong style={{ ...styles.metricValue, fontSize: 22 }}>
                  {formatTournoi === "elimination" && journees.length > 0
                ? titreJournee(journees[journees.length - 1])
                : formatTournoi === "poulesFinale" && matchsFinale.length > 0
                    ? titreJournee(Math.max(...matchsFinale.map((match) => match.journee)))
                    : formatTournoi === "poulesFinale"
                        ? tr("Poules") : tr(LIBELLES_FORMAT[formatTournoi])}
                </strong>
                <span style={styles.metricHint}>{tr("mise \u00E0 jour automatique")}</span>
              </article>
            </section>

            {(formatTournoi === "elimination" || formatTournoi === "poulesFinale") && renduResultatFinal()}

            <section style={styles.card}>
              <span style={styles.eyebrow}>{tr("Vue d\u2019ensemble")}</span>
              <h2 style={styles.sectionTitle}>{tr("Activit\u00E9 du tournoi")}</h2>
              <div style={styles.activityList}>
                <div style={styles.activityRow}><span>{tr("Format")}</span><strong>{tr(LIBELLES_FORMAT[formatTournoi])}</strong></div>
                <div style={styles.activityRow}><span>{tr("Sport")}</span><strong>{tr(LIBELLES_SPORT[sport]) ?? sport}</strong></div>
                <div style={styles.activityRow}><span>{tr("R\u00E9sultats saisis")}</span><strong>{joues}</strong></div>
                <div style={styles.activityRow}><span>{tr("R\u00E9sultats restant \u00E0 saisir")}</span><strong>{Math.max(0, (totalMatchsTheorique || matchs.length) - joues)}</strong></div>
              </div>
            </section>
          </>)}

        {aideOuverte && (<div style={styles.modalBackdrop} onClick={() => setAideOuverte(false)}>
            <section style={styles.helpModal} onClick={(event) => event.stopPropagation()}>
              <LogoTourneo compact/>
              <div style={{ marginTop: 18 }}>
                <span style={styles.eyebrow}>{tr("Aide \u00B7 s\u00E9curit\u00E9 \u00B7 r\u00E8gles")}</span>
                <h2 style={styles.sectionTitle}>{tr("Comment fonctionne Tourneo ?")}</h2>
              </div>
              <div style={styles.helpGrid}>
                <article style={styles.helpItem}><strong>{tr("1. Cr\u00E9er")}</strong><span>{tr("Choisissez le sport, le format et les participants.")}</span></article>
                <article style={styles.helpItem}><strong>{tr("2. Jouer")}</strong><span>{tr("L\u2019organisateur saisit et valide les r\u00E9sultats.")}</span></article>
                <article style={styles.helpItem}><strong>{tr("3. Partager")}</strong><span>{tr("Le QR du tournoi ouvre une vue publique strictement en lecture seule.")}</span></article>
                <article style={styles.helpItem}><strong>{tr("4. Progresser")}</strong><span>{tr("Les joueurs identifi\u00E9s gagnent des points et des badges dans leur profil.")}</span></article>
              </div>
              <div style={styles.legalBox}>
                <strong>{tr("Responsabilit\u00E9 & int\u00E9grit\u00E9")}</strong>
                <p>{tr("Tourneo est un outil d\u2019organisation et d\u2019aide au calcul. L\u2019organisateur reste responsable des r\u00E8gles appliqu\u00E9es, de la saisie et de la validation des r\u00E9sultats, des participants et de l\u2019arbitrage des litiges. En cas d\u2019\u00E9cart entre l\u2019application et une d\u00E9cision officielle de l\u2019organisateur, la d\u00E9cision humaine pr\u00E9vaut.")}</p>
                <p>{tr("Un incident technique, une interruption r\u00E9seau ou une erreur logicielle peut survenir. Conservez les r\u00E9sultats importants et utilisez l\u2019export lorsque n\u00E9cessaire.")}</p>
              </div>
              <div style={styles.legalBox}>
                <strong>{tr("Donn\u00E9es & s\u00E9curit\u00E9")}</strong>
                <p>{tr("Le lien public ne permet pas de modifier les scores. Les profils joueurs n\u2019exposent que le pseudo, le code joueur, les badges et le palmar\u00E8s. \u00C9vitez de saisir des informations sensibles dans les noms de tournois ou de participants.")}</p>
              </div>
              <button style={styles.primaryButton} onClick={() => (window.location.href = "/aide")}>{tr("Ouvrir le centre d\u2019aide")}</button>
              <button style={styles.ghostWide} onClick={() => setAideOuverte(false)}>{tr("Fermer")}</button>
            </section>
          </div>)}

        {qrOuvert && (<div style={styles.modalBackdrop} onClick={() => setQrOuvert(false)}>
            <section style={styles.qrModal} onClick={(event) => event.stopPropagation()}>
              <LogoTourneo compact/>
              <div style={{ marginTop: 20 }}>
                <span style={styles.eyebrow}>{tr("Partager")}</span>
                <h2 style={styles.sectionTitle}>{tr("QR code du tournoi")}</h2>
              </div>
              <div style={styles.qrBox}><QRCodeSVG value={lienPartage} size={220}/></div>
              <p style={styles.shareLink}>{lienPartage}</p>
              <button style={styles.primaryButton} onClick={copierLien}>{tr("Copier le lien")}</button>
              <button style={styles.ghostWide} onClick={() => setQrOuvert(false)}>{tr("Fermer")}</button>
            </section>
          </div>)}
      </div>

      {souvenirOuvert && (<div style={styles.modalBackdrop}>
          <section className="tourneo-souvenir-modal" style={{ ...styles.modalCard, maxWidth: 1180 }}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("Souvenir du tournoi")}</span>
                <h2 style={styles.sectionTitle}>{nomTournoi}</h2>
              </div>
              <button style={styles.modalClose} onClick={() => setSouvenirOuvert(false)}>×</button>
            </div>

            <p>{tr("Les photos de tournoi sont priv\u00E9es et supprim\u00E9es automatiquement 15 jours apr\u00E8s la fin du tournoi, ou 90 jours en mode Expert. Les avatars de profil ne sont pas concern\u00E9s.")}{photosExpirentAt ? trModele(" \u00C9ch\u00E9ance : {0}.", new Date(photosExpirentAt).toLocaleDateString(localeFormat())) : ""}</p>
            {podiumPhotoUrl && (<div style={styles.souvenirTools}>
                <button style={styles.ghostButton} onClick={() => setPodiumPhotoUrl("")}>{tr("Retirer la photo")}</button>
              </div>)}

            <div id="tourneo-souvenir" className="tourneo-souvenir-poster" style={styles.souvenirPoster}>
              <div className="tourneo-souvenir-brand" style={styles.souvenirBrand}>
                <TourneoBrand />
              </div>

              <label className="tourneo-souvenir-photo-zone" style={podiumPhotoUrl ? styles.souvenirPhotoFrame : styles.souvenirPhotoPlaceholder} title={podiumPhotoUrl ? tr("Changer la photo des finalistes") : tr("Ajouter la photo des 3 finalistes")}>
                <input type="file" accept="image/*" capture="environment" onChange={choisirPhotoPodium} style={{ display: "none" }}/>

                {podiumPhotoUrl ? (<>
                    <PhotoPrivee src={podiumPhotoUrl} alt={tr("Photo des finalistes")} style={styles.souvenirPhoto}/>
                    <span style={styles.photoCaption}>{tr("\uD83D\uDCF7 Cliquer pour changer la photo")}</span>
                  </>) : (<>
                    <span style={{ fontSize: 34 }}>📸</span>
                    <strong>{tr("Photo des 3 finalistes")}</strong>
                    <span>{tr("Ajoutez une photo avant d\u2019imprimer ou partager l\u2019affiche.")}</span>
                    <span style={styles.photoTapHint}>{tr("Cliquer ici pour prendre ou choisir une photo")}</span>
                  </>)}
              </label>

              <div className="tourneo-souvenir-right" style={styles.souvenirRight}>
                <div style={styles.souvenirTitleBox}>
                  <span style={styles.eyebrow}>{tr("R\u00E9sultats officiels")}</span>
                  <h2 style={styles.souvenirTitle}>{nomTournoi}</h2>
                  <p style={styles.souvenirMeta}>{tr(LIBELLES_SPORT[sport]) ?? sport} · {tr(LIBELLES_FORMAT[formatTournoi])}</p>
                </div>

                {podium.length >= 3 && (<div className="tourneo-souvenir-podium" style={styles.souvenirPodium}>
                    {[podium[1], podium[0], podium[2]].map((ligne, index) => {
                    const rang = index === 0 ? 2 : index === 1 ? 1 : 3;
                    const hauteur = rang === 1 ? 140 : rang === 2 ? 112 : 96;
                    return (<div key={ligne.equipe.id} style={styles.souvenirPodiumColumn}>
                          <TeamAvatar equipe={ligne.equipe} taille={rang === 1 ? 64 : 52}/>
                          <strong style={styles.souvenirPlayerName}>{ligne.equipe.nom}</strong>
                          <span style={styles.souvenirPoints}>{ligne.pts}{tr(" pts")}</span>
                          <div style={{ ...styles.souvenirPodiumBlock, minHeight: hauteur, ...(rang === 1 ? styles.souvenirFirst : rang === 2 ? styles.souvenirSecond : styles.souvenirThird) }}>
                            <span style={styles.souvenirMedal}>{rang === 1 ? "🥇" : rang === 2 ? "🥈" : "🥉"}</span>
                            <strong>{rang}</strong>
                          </div>
                        </div>);
                })}
                  </div>)}

                <div className="tourneo-souvenir-footer" style={styles.souvenirFooter}>
                  <div style={styles.qrSouvenirBox}>
                    {lienPartage && <QRCodeSVG value={lienPartage} size={92}/>}
                  </div>
                  <div style={styles.qrSouvenirText}>
                    <strong>{tr("Voir le classement complet")}</strong>
                    <span>{tr("Scannez ce QR code pour retrouver tous les participants, les matchs et le classement du tournoi.")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tourneo-souvenir-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button style={styles.primaryButton} onClick={() => window.print()}>{tr("Imprimer / enregistrer en PDF")}</button>
              <button style={styles.secondaryButton} onClick={partagerAfficheSouvenir}>{tr("Partager l\u2019affiche avec la photo")}</button>
            </div>
          </section>
        </div>)}

      {scannerOuvert && (<div style={styles.modalBackdrop} onClick={fermerScanner}>
          <section style={styles.scannerModal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.eyebrow}>{tr("Profil Tourneo")}</span>
                <h2 style={styles.sectionTitle}>{tr("Scanner le QR joueur")}</h2>
              </div>
              <button style={styles.modalClose} onClick={fermerScanner}>×</button>
            </div>

            <div style={styles.scannerViewport}>
              <video ref={videoScannerRef} playsInline muted style={styles.scannerVideo}/>
              <div style={styles.scannerFrame}/>
            </div>

            <p style={styles.scannerHelp}>{tr("Placez le QR personnel du joueur au centre. Son profil sera ajout\u00E9 automatiquement.")}</p>
            {tr(scannerMessage) && <div style={styles.inlineWarning}>{tr(scannerMessage)}</div>}
            <button style={styles.ghostWide} onClick={fermerScanner}>{tr("Annuler")}</button>
          </section>
        </div>)}

      <TeamModal enCours={cree && !modificationParticipantsAutorisee} ouvert={modalOuvert} equipeAModifier={equipeAModifier} onFermer={() => {
            setModalOuvert(false);
            setEquipeAModifier(null);
        }} onAjouter={enregistrerEquipe}/>
    </main>);
}
const styles: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "0 16px 64px",
        background: "radial-gradient(circle at 8% 5%, rgba(124,92,255,.30), transparent 25%), radial-gradient(circle at 88% 8%, rgba(34,211,238,.20), transparent 26%), radial-gradient(circle at 55% 88%, rgba(236,72,153,.10), transparent 30%), linear-gradient(145deg,#080A12 0%,#0B1020 45%,#090D18 100%)",
        color: "#F7F8FC",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    shell: { width: "100%", maxWidth: 1180, margin: "0 auto" },
    appBar: {
        minHeight: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(9,12,22,.72)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,.09)",
        boxShadow: "0 14px 35px rgba(0,0,0,.16)",
    },
    appBarActions: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
    brand: { display: "flex", alignItems: "center", gap: 11 },
    brandName: { fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1 },
    brandBaseline: { color: "#7F8798", fontSize: 11, marginTop: 4, letterSpacing: ".02em" },
    creationLayout: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 22,
        alignItems: "start",
        paddingTop: 34,
    },
    heroCard: {
        minHeight: 420,
        padding: "clamp(28px, 5vw, 52px)",
        borderRadius: 28,
        background: "radial-gradient(circle at 85% 12%, rgba(34,211,238,.24), transparent 28%), linear-gradient(145deg, rgba(124,92,255,.40), rgba(20,25,43,.94) 48%, rgba(12,18,33,.98))",
        border: "1px solid rgba(166,153,255,.38)",
        boxShadow: "0 35px 100px rgba(22,20,60,.40), inset 0 1px 0 rgba(255,255,255,.07)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
    },
    heroTitle: { margin: "10px 0 16px", fontSize: "clamp(42px, 7vw, 72px)", lineHeight: .96, letterSpacing: "-.055em" },
    heroText: { margin: 0, color: "#A8AFBF", fontSize: 18, lineHeight: 1.6, maxWidth: 560 },
    heroFeatureGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 34 },
    heroFeature: { padding: 15, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.045))", border: "1px solid rgba(255,255,255,.12)", display: "grid", gap: 4, backdropFilter: "blur(10px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" },
    formCard: { padding: "clamp(22px, 4vw, 32px)", borderRadius: 28, background: "linear-gradient(180deg,rgba(23,29,48,.90),rgba(14,18,31,.94))", border: "1px solid rgba(148,163,184,.15)", backdropFilter: "blur(18px)", boxShadow: "0 28px 90px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05)" },
    formHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
    eyebrow: { display: "block", color: "#64D8FF", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 900 },
    sectionTitle: { margin: "5px 0 0", fontSize: "clamp(24px, 4vw, 32px)", letterSpacing: "-.035em" },
    smallTitle: { margin: "5px 0 0", fontSize: 20, letterSpacing: "-.02em" },
    label: { display: "block", margin: "20px 0 8px", color: "#C7CCDA", fontSize: 13, fontWeight: 750 },
    input: { width: "100%", boxSizing: "border-box", padding: "14px 15px", borderRadius: 14, border: "1px solid rgba(148,163,184,.22)", outline: "none", background: "rgba(7,11,21,.68)", color: "#F7F8FC", fontSize: 15, boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" },
    twoColumns: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: 14 },
    configBox: { marginTop: 20, padding: 16, borderRadius: 18, background: "#0E1118", border: "1px solid #242A38" },
    participantsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 26 },
    teamList: { display: "grid", gap: 10, marginTop: 14 },
    emptyState: { padding: 22, borderRadius: 16, border: "1px dashed #353C50", color: "#7F8798", textAlign: "center", background: "#0D1017" },
    primaryButton: { width: "100%", marginTop: 24, padding: "15px 18px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 15, background: "linear-gradient(100deg,#7357FF 0%,#3B82F6 50%,#22D3EE 100%)", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: "0 16px 42px rgba(59,130,246,.30), inset 0 1px 0 rgba(255,255,255,.20)" },
    primarySmall: { padding: "11px 15px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 13, background: "linear-gradient(100deg,#7357FF,#3B82F6 58%,#22D3EE)", color: "white", fontWeight: 850, cursor: "pointer", boxShadow: "0 10px 28px rgba(59,130,246,.22)" },
    secondaryButton: { padding: "11px 14px", borderRadius: 13, border: "1px solid rgba(148,163,184,.18)", background: "linear-gradient(180deg,rgba(33,40,62,.78),rgba(17,22,36,.78))", color: "#EDF3FF", fontWeight: 780, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)" },
    ghostButton: { padding: "10px 12px", borderRadius: 11, border: "1px solid transparent", background: "transparent", color: "#AEB5C5", fontWeight: 700, cursor: "pointer" },
    dangerButton: { width: "100%", marginTop: 10, padding: "13px 16px", borderRadius: 13, border: "1px solid rgba(248,113,113,.25)", background: "rgba(248,113,113,.08)", color: "#FDA4AF", fontWeight: 800, cursor: "pointer" },
    statusLine: { marginTop: 12, textAlign: "center", color: "#8D95A7", fontSize: 13 },
    formatExplanation: {
        marginTop: 10,
        padding: "12px 14px",
        display: "grid",
        gap: 5,
        borderRadius: 14,
        background: "rgba(114,231,255,.045)",
        border: "1px solid rgba(114,231,255,.10)",
        color: "#8D95A7",
        fontSize: 13,
        lineHeight: 1.5,
        textAlign: "left",
    },
    tournamentHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 22, flexWrap: "wrap", padding: "34px 0 22px" },
    metaRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    formatBadge: { padding: "7px 11px", borderRadius: 999, background: "linear-gradient(90deg,rgba(124,92,255,.20),rgba(34,211,238,.13))", border: "1px solid rgba(92,207,255,.28)", color: "#BFEAFF", fontSize: 12, fontWeight: 900, boxShadow: "0 6px 18px rgba(34,211,238,.08)" },
    metaText: { color: "#8D95A7", fontSize: 13, fontWeight: 700 },
    tournamentTitle: { margin: "12px 0 6px", fontSize: "clamp(38px, 7vw, 66px)", lineHeight: .96, letterSpacing: "-.055em", overflowWrap: "anywhere", textShadow: "0 10px 40px rgba(59,130,246,.12)" },
    tournamentSubtitle: { margin: 0, color: "#8D95A7", fontSize: 15 },
    syncBadge: { marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, color: "#8FA99E", fontSize: 12, fontWeight: 750 },
    syncDot: { width: 7, height: 7, borderRadius: 999, background: "#2ED3B7", boxShadow: "0 0 0 4px rgba(46,211,183,.09)" },
    headerActions: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
    progressCard: { padding: 19, borderRadius: 21, background: "linear-gradient(135deg,rgba(24,30,50,.92),rgba(12,18,32,.92))", border: "1px solid rgba(148,163,184,.14)", marginBottom: 16, boxShadow: "0 18px 50px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)" },
    progressTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 12 },
    progressTitle: { display: "block", marginTop: 4, fontSize: 18 },
    progressNumbers: { color: "#A8AFBF", fontWeight: 800, fontVariantNumeric: "tabular-nums" },
    progressTrack: { height: 9, borderRadius: 999, overflow: "hidden", background: "rgba(4,8,16,.82)", boxShadow: "inset 0 1px 4px rgba(0,0,0,.5)" },
    progressBar: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7C5CFF 0%,#3B82F6 46%,#22D3EE 78%,#34D399 100%)", transition: "width .25s ease", boxShadow: "0 0 22px rgba(34,211,238,.34)" },
    nav: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, padding: 6, borderRadius: 18, background: "rgba(12,17,30,.82)", border: "1px solid rgba(148,163,184,.13)", backdropFilter: "blur(16px)", marginBottom: 16, boxShadow: "0 16px 38px rgba(0,0,0,.16)" },
    tab: { padding: "12px 10px", border: 0, borderRadius: 11, background: "transparent", color: "#7F8798", fontWeight: 800, cursor: "pointer" },
    tabActive: { background: "linear-gradient(110deg,rgba(124,92,255,.30),rgba(59,130,246,.22),rgba(34,211,238,.12))", color: "#FFFFFF", boxShadow: "0 8px 24px rgba(59,130,246,.15), inset 0 1px 0 rgba(255,255,255,.07)", border: "1px solid rgba(125,211,252,.13)" },
    card: { padding: "clamp(18px, 3vw, 26px)", borderRadius: 24, background: "linear-gradient(155deg,rgba(25,31,51,.92),rgba(13,18,31,.92))", border: "1px solid rgba(148,163,184,.14)", marginBottom: 16, backdropFilter: "blur(14px)", boxShadow: "0 22px 65px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)" },
    pill: { display: "inline-flex", alignItems: "center", padding: "6px 9px", borderRadius: 999, background: "#1D2230", color: "#9EA6B8", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" },
    poolGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 12, marginTop: 18 },
    poolCard: { padding: 16, borderRadius: 17, background: "#0D1017", border: "1px solid #252B3A", minWidth: 0 },
    poolHeader: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 },
    poolTitle: { margin: 0, fontSize: 17, letterSpacing: "-.02em" },
    poolTeams: { display: "grid", gap: 8 },
    poolTeam: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, background: "#121620" },
    terrainLabel: { display: "inline-block", marginBottom: 12, color: "#8E88FF", fontSize: 12, fontWeight: 800 },
    roundHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 },
    matchList: { display: "grid", gap: 10 },
    matchCard: { padding: 15, borderRadius: 18, background: "linear-gradient(135deg,rgba(13,18,31,.96),rgba(18,25,42,.92))", border: "1px solid rgba(148,163,184,.15)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.025)" },
    matchDone: { borderColor: "rgba(34,211,238,.30)", boxShadow: "0 10px 28px rgba(34,211,238,.05), inset 3px 0 0 rgba(52,211,153,.60)" },
    matchMeta: { display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 10, color: "#7F8798", fontSize: 11, fontWeight: 800 },
    matchGrid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 54px 16px 54px minmax(0,1fr)", alignItems: "center", gap: 8 },
    teamLeft: { display: "flex", minWidth: 0, alignItems: "center", justifyContent: "flex-end", gap: 9, textAlign: "right", overflowWrap: "anywhere" },
    teamRight: { display: "flex", minWidth: 0, alignItems: "center", gap: 9, overflowWrap: "anywhere" },
    scoreInput: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "11px 4px", borderRadius: 12, border: "1px solid rgba(96,165,250,.28)", background: "linear-gradient(180deg,rgba(30,41,59,.95),rgba(16,24,40,.95))", color: "#FFFFFF", textAlign: "center", fontWeight: 950, fontSize: 18, fontVariantNumeric: "tabular-nums", boxShadow: "0 8px 20px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.04)" },
    scoreLocked: { opacity: .62, cursor: "not-allowed" },
    scoreSeparator: { textAlign: "center", color: "#6F778A", fontWeight: 900 },
    inlineWarning: { marginTop: 10, padding: "9px 11px", borderRadius: 10, background: "rgba(248,113,113,.08)", color: "#FDA4AF", fontSize: 12, textAlign: "center" },
    tableWrap: { overflowX: "auto", marginTop: 16 },
    table: { width: "100%", minWidth: 680, borderCollapse: "collapse", textAlign: "center", fontSize: 13 },
    teamCell: { display: "flex", alignItems: "center", gap: 10, textAlign: "left" },
    podiumModern: { display: "grid", gridTemplateColumns: "repeat(3,minmax(150px,1fr))", gap: 10, marginTop: 22, overflowX: "auto" },
    podiumModernCard: { minWidth: 150, padding: 18, borderRadius: 18, background: "#0D1017", border: "1px solid #252B3A", display: "grid", justifyItems: "center", gap: 9, textAlign: "center" },
    podiumWinner: { background: "linear-gradient(180deg, rgba(99,91,255,.18), #0D1017)", borderColor: "rgba(99,91,255,.38)" },
    podiumStage: { display: "grid", gridTemplateColumns: "repeat(3,minmax(165px,1fr))", gap: 16, alignItems: "end", marginTop: 26, overflowX: "auto", padding: "12px 4px 2px" },
    podiumColumn: { minWidth: 165, display: "grid", alignItems: "end" },
    podiumColumnFirst: { transform: "translateY(-10px)" },
    podiumPlayer: { position: "relative", display: "grid", justifyItems: "center", gap: 8, textAlign: "center", padding: "18px 12px 16px", margin: "0 7px 10px", borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.028))", border: "1px solid rgba(148,163,184,.16)", boxShadow: "0 18px 45px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.05)" },
    podiumPlayerFirst: { background: "radial-gradient(circle at 50% 0%,rgba(250,204,21,.18),transparent 45%),linear-gradient(180deg,rgba(124,92,255,.16),rgba(255,255,255,.035))", border: "1px solid rgba(250,204,21,.30)", boxShadow: "0 22px 60px rgba(124,92,255,.18),inset 0 1px 0 rgba(255,255,255,.08)" },
    podiumRankBadge: { position: "absolute", top: 10, left: 10, width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999, background: "rgba(5,10,20,.68)", border: "1px solid rgba(255,255,255,.12)", color: "#EAF4FF", fontWeight: 950, fontSize: 12 },
    podiumMedal: { fontSize: 28, lineHeight: 1 },
    podiumScore: { color: "#9DB1C8", fontSize: 12, fontWeight: 800 },
    podiumBlock: { display: "grid", placeItems: "center", alignContent: "center", gap: 5, borderRadius: "20px 20px 8px 8px", border: "1px solid rgba(255,255,255,.14)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 18px 40px rgba(0,0,0,.18)" },
    podiumBlockFirst: { background: "linear-gradient(180deg,#EED06C 0%,#C58B22 56%,#9F6310 100%)", color: "#FFF9E8" },
    podiumBlockSecond: { background: "linear-gradient(180deg,#C6D2E1 0%,#8193AA 58%,#5B6B80 100%)", color: "#F8FBFF" },
    podiumBlockThird: { background: "linear-gradient(180deg,#D49A6A 0%,#9B6240 58%,#6D3E27 100%)", color: "#FFF4EC" },
    podiumPlace: { fontSize: 38, lineHeight: 1, textShadow: "0 4px 18px rgba(0,0,0,.20)" },
    podiumPlaceLabel: { fontSize: 10, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", opacity: .82 },
    rankNumber: { width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999, background: "#23293A", color: "#B7BDCC", fontWeight: 900, fontSize: 12 },
    finalResult: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 22, alignItems: "stretch" },
    finalistCard: { padding: 22, borderRadius: 18, background: "#0D1017", border: "1px solid #252B3A", display: "grid", justifyItems: "center", gap: 8, textAlign: "center" },
    championCard: { padding: 24, borderRadius: 22, background: "radial-gradient(circle at 50% 0%,rgba(34,211,238,.22),transparent 38%),linear-gradient(145deg,rgba(124,92,255,.34),rgba(17,25,45,.98))", border: "1px solid rgba(96,165,250,.42)", display: "grid", justifyItems: "center", gap: 8, textAlign: "center", boxShadow: "0 24px 60px rgba(59,130,246,.18), inset 0 1px 0 rgba(255,255,255,.08)" },
    championLabel: { color: "#B9B6FF", fontSize: 10, fontWeight: 950, letterSpacing: ".16em" },
    championName: { fontSize: 26, letterSpacing: "-.03em" },
    finalName: { fontSize: 18, letterSpacing: "-.02em" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 16 },
    metricCard: { padding: 21, borderRadius: 20, background: "radial-gradient(circle at 100% 0%,rgba(59,130,246,.12),transparent 34%),linear-gradient(160deg,rgba(25,31,51,.94),rgba(13,18,31,.94))", border: "1px solid rgba(148,163,184,.14)", display: "grid", gap: 7, boxShadow: "0 18px 45px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.04)" },
    metricLabel: { color: "#8D95A7", fontSize: 12, fontWeight: 750 },
    metricValue: { fontSize: 34, letterSpacing: "-.04em" },
    metricHint: { color: "#6F778A", fontSize: 11 },
    activityList: { display: "grid", gap: 0, marginTop: 16, borderTop: "1px solid #232837" },
    activityRow: { display: "flex", justifyContent: "space-between", gap: 14, padding: "14px 0", borderBottom: "1px solid #232837", color: "#9DA5B6" },
    modalBackdrop: { position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 18, background: "rgba(5,7,11,.82)", backdropFilter: "blur(10px)" },
    modalCard: { width: "100%", maxHeight: "92vh", overflowY: "auto", padding: 22, borderRadius: 24, background: "#0B1323", border: "1px solid rgba(148,163,184,.18)", color: "white", boxShadow: "0 24px 70px rgba(0,0,0,.45)" },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
    modalClose: { width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 13, border: "1px solid rgba(148,163,184,.16)", background: "rgba(255,255,255,.04)", color: "white", fontSize: 24, cursor: "pointer" },
    qrModal: { width: "100%", maxWidth: 420, padding: 26, borderRadius: 24, background: "#12151E", border: "1px solid #2A3040", boxShadow: "0 28px 90px rgba(0,0,0,.45)" },
    qrBox: { width: "fit-content", margin: "20px auto 0", padding: 14, borderRadius: 16, background: "white" },
    playerCodeBox: { padding: 16, margin: "14px 0", borderRadius: 18, display: "grid", gap: 12, background: "rgba(59,130,246,.07)", border: "1px solid rgba(96,165,250,.16)" },
    selfAddLine: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, margin: "8px 2px 2px" },
    selfAddHint: { color: "#6F8097", fontSize: 10 },
    selfAddButton: { padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(148,163,184,.12)", background: "rgba(255,255,255,.025)", color: "#91A2B8", fontSize: 10, fontWeight: 750, cursor: "pointer" },
    scanButton: { width: "100%", padding: "11px 13px", borderRadius: 13, border: "1px solid rgba(34,211,238,.20)", background: "rgba(34,211,238,.07)", color: "#A5F3FC", fontWeight: 850, cursor: "pointer" },
    scannerModal: { width: "min(440px,100%)", padding: 20, borderRadius: 24, background: "#0B1323", border: "1px solid rgba(148,163,184,.18)", color: "white", boxShadow: "0 24px 70px rgba(0,0,0,.48)" },
    scannerViewport: { position: "relative", width: "100%", aspectRatio: "1 / 1", marginTop: 14, overflow: "hidden", borderRadius: 20, background: "#030712" },
    scannerVideo: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    scannerFrame: { position: "absolute", inset: "18%", border: "2px solid #67E8F9", borderRadius: 18, boxShadow: "0 0 0 999px rgba(0,0,0,.26),0 0 24px rgba(34,211,238,.28)" },
    scannerHelp: { margin: "12px 0 0", color: "#91A4BC", lineHeight: 1.5, textAlign: "center", fontSize: 13 },
    playerCodeActions: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" },
    helpModal: { width: "min(760px,100%)", maxHeight: "88vh", overflowY: "auto", padding: 24, borderRadius: 28, background: "linear-gradient(145deg,#11192a,#0a1220)", border: "1px solid rgba(148,163,184,.16)", boxShadow: "0 35px 90px rgba(0,0,0,.55)" },
    helpGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, margin: "18px 0" },
    helpItem: { display: "grid", gap: 6, padding: 15, borderRadius: 16, background: "rgba(255,255,255,.035)", border: "1px solid rgba(148,163,184,.10)", color: "#9fb1c8" },
    legalBox: { padding: 16, marginTop: 10, borderRadius: 16, background: "rgba(124,92,255,.055)", border: "1px solid rgba(124,92,255,.14)", color: "#aabbd0", lineHeight: 1.55 },
    shareLink: { color: "#858DA0", fontSize: 12, overflowWrap: "anywhere", textAlign: "center" },
    ghostWide: { width: "100%", marginTop: 8, padding: "12px 14px", borderRadius: 12, border: "1px solid #313748", background: "transparent", color: "#B1B8C8", fontWeight: 750, cursor: "pointer" },
    souvenirTools: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 },
    photoButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "11px 14px", borderRadius: 13, background: "linear-gradient(110deg,rgba(124,92,255,.28),rgba(34,211,238,.16))", border: "1px solid rgba(114,231,255,.24)", color: "white", fontWeight: 850, cursor: "pointer" },
    souvenirPoster: { padding: "clamp(20px,4vw,34px)", borderRadius: 28, background: "radial-gradient(circle at 18% 0%,rgba(124,92,255,.28),transparent 30%),radial-gradient(circle at 90% 12%,rgba(34,211,238,.18),transparent 28%),linear-gradient(145deg,#06101C,#0D1830 58%,#101A2D)", border: "1px solid rgba(114,231,255,.22)", boxShadow: "0 28px 80px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.06)", overflow: "hidden" },
    souvenirBrand: { display: "flex", alignItems: "flex-start", minWidth: 0 },
    souvenirRight: { minWidth: 0, display: "flex", flexDirection: "column" },
    souvenirTitleBox: { textAlign: "right", minWidth: 0, position: "relative", zIndex: 2 },
    souvenirTitle: { margin: "4px 0", fontSize: "clamp(28px,4.2vw,44px)", lineHeight: 1, letterSpacing: "-.045em" },
    souvenirMeta: { margin: 0, color: "#9CB1C9", fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" },
    souvenirPhotoFrame: { marginTop: 24, padding: 8, borderRadius: 24, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.10)", position: "relative", display: "block", cursor: "pointer", overflow: "hidden" },
    souvenirPhoto: { width: "100%", height: "clamp(220px,38vw,360px)", objectFit: "cover", borderRadius: 18, display: "block" },
    photoCaption: { position: "absolute", left: 20, bottom: 18, padding: "8px 11px", borderRadius: 999, background: "rgba(6,12,24,.78)", color: "white", fontSize: 12, fontWeight: 800, backdropFilter: "blur(10px)" },
    souvenirPhotoPlaceholder: { marginTop: 24, minHeight: 180, display: "grid", placeItems: "center", alignContent: "center", gap: 7, padding: 22, borderRadius: 22, border: "1px dashed rgba(114,231,255,.28)", background: "rgba(255,255,255,.025)", color: "#9DB0C8", textAlign: "center", cursor: "pointer" },
    photoTapHint: { marginTop: 5, padding: "7px 10px", borderRadius: 999, color: "#8EEBFF", background: "rgba(34,211,238,.07)", border: "1px solid rgba(34,211,238,.12)", fontSize: 11, fontWeight: 850 },
    souvenirPodium: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, alignItems: "end", marginTop: 22, overflow: "hidden", minWidth: 0, position: "relative", zIndex: 1 },
    souvenirPodiumColumn: { minWidth: 0, display: "grid", justifyItems: "center", alignItems: "end", textAlign: "center" },
    souvenirPlayerName: { marginTop: 7, fontSize: 15, maxWidth: "100%", overflowWrap: "anywhere" },
    souvenirPoints: { margin: "4px 0 10px", color: "#A9BDD2", fontSize: 12, fontWeight: 750 },
    souvenirPodiumBlock: { width: "100%", minWidth: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 4, borderRadius: "17px 17px 5px 5px", border: "1px solid rgba(255,255,255,.14)", fontSize: 31, fontWeight: 950, boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 16px 30px rgba(0,0,0,.18)" },
    souvenirFirst: { background: "linear-gradient(180deg,#E5BE60,#A96D13)", color: "#FFF8E7" },
    souvenirSecond: { background: "linear-gradient(180deg,#AEBED2,#596D87)", color: "#F7FAFF" },
    souvenirThird: { background: "linear-gradient(180deg,#C88A5C,#744429)", color: "#FFF2E8" },
    souvenirMedal: { fontSize: 24 },
    souvenirFooter: { display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 14, alignItems: "center", marginTop: 26, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.10)", minWidth: 0 },
    qrSouvenirBox: { padding: 10, borderRadius: 15, background: "white", width: "fit-content" },
    qrSouvenirText: { display: "grid", gap: 5, color: "#A8BAD0", lineHeight: 1.5 },
    loaderCard: { minHeight: "100vh", display: "grid", placeItems: "center", alignContent: "center", gap: 16 },
    muted: { color: "#858DA0", lineHeight: 1.55 },
    eliminationRanking: { display: "grid", gap: 12, marginTop: 20 },
    eliminationRankRow: {
        display: "grid",
        gridTemplateColumns: "44px 44px minmax(0,1fr) auto",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,.16)",
        background: "rgba(255,255,255,.035)",
    },
    eliminationRankWinner: {
        border: "1px solid rgba(34,211,238,.42)",
        background: "linear-gradient(100deg,rgba(59,130,246,.22),rgba(34,211,238,.08))",
        boxShadow: "0 16px 45px rgba(14,165,233,.10)",
    },
    eliminationRank: {
        width: 36,
        height: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: 12,
        background: "rgba(124,92,255,.18)",
        color: "#dbeafe",
        fontWeight: 900,
    },
    eliminationStatus: { color: "#8be9ff", fontSize: 13, fontWeight: 800 },
    eliminationGroup: {
        padding: 16,
        borderRadius: 18,
        background: "rgba(7,16,31,.40)",
        border: "1px solid rgba(148,163,184,.10)",
    },
    eliminationGroupTitle: {
        marginBottom: 10,
        color: "#8fa3bf",
        fontSize: 12,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: 1.1,
    },
    eliminationGroupTeams: { display: "flex", flexWrap: "wrap", gap: 8 },
    eliminationChip: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 11px",
        borderRadius: 999,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(148,163,184,.12)",
        fontSize: 13,
        fontWeight: 700,
    },
};
