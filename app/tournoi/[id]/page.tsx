"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import TeamAvatar from "@/components/TeamAvatar";
import TeamCard from "@/components/TeamCard";
import TeamModal from "@/components/TeamModal";
import {
  calculerClassement,
  genererMatchs,
  genererMatchsElimination,
} from "@/lib/tournoi";
import type { Equipe, Match } from "@/types";
import { supabase } from "@/lib/supabase";
import TourneoBrand from "@/components/TourneoBrand";
import TourneoNav from "@/components/TourneoNav";

const CLE = "tourneo-v04";
const SEUIL_PHASE_FINALE = 100000;

type FormatTournoi = "complet" | "poules" | "elimination" | "poulesFinale";
type ModePoules = "nombrePoules" | "taillePoules";
type Onglet = "matchs" | "classement" | "statistiques" | "participants";

type Poule = {
  id: string;
  nom: string;
  terrain: string;
  equipes: Equipe[];
};

const LIBELLES_FORMAT: Record<FormatTournoi, string> = {
  complet: "Championnat complet",
  poules: "Phase de poules",
  elimination: "Élimination directe",
  poulesFinale: "Poules puis phase finale",
};

const EXPLICATIONS_FORMAT: Record<FormatTournoi, string> = {
  complet: "Tout le monde rencontre tout le monde. Classement général aux points.",
  poules: "Les participants sont répartis en groupes avec un classement par poule.",
  elimination: "Une défaite élimine. Les vainqueurs avancent jusqu’à la finale.",
  poulesFinale: "Phase de poules puis qualification automatique vers une phase finale.",
};

const LIBELLES_SPORT: Record<string, string> = {
  multisport: "Multisport",
  football: "Football",
  futsal: "Futsal",
  basket: "Basket-ball",
  handball: "Handball",
  volley: "Volley-ball",
  rugby7: "Rugby à 7 / Touch rugby",
  hockey: "Hockey",
  tennis: "Tennis",
  padel: "Padel",
  badminton: "Badminton",
  squash: "Squash",
  "ping-pong": "Tennis de table",
  petanque: "Pétanque",
  flechettes: "Fléchettes",
  bowling: "Bowling",
  billard: "Billard",
  babyfoot: "Baby-foot",
  cornhole: "Cornhole",
  palets: "Palets",
  molkky: "Mölkky",
  spikeball: "Roundnet / Spikeball",
  esport: "E-sport",
  echecs: "Échecs",
  dames: "Jeu de dames",
  cartes: "Jeux de cartes",
  jeuxsociete: "Jeux de société compétitifs",
  autre: "Autre sport / jeu",
};

const PARTENAIRES_SUGGERES: Record<string, string> = {
  petanque: "OBUT",
  football: "Nike",
  futsal: "Nike",
  basket: "Nike",
  tennis: "Wilson",
  padel: "HEAD",
  badminton: "Yonex",
  "ping-pong": "Cornilleau",
  flechettes: "Winmau",
  multisport: "Decathlon",
};

function partenairePourSport(sport: string) {
  return PARTENAIRES_SUGGERES[sport] ?? "Decathlon";
}

function capitaliserNom(valeur: string) {
  return valeur.replace(/(^|\s|[-’'])\p{L}/gu, (lettre) => lettre.toUpperCase());
}

function pointsPourRang(rang: number) {
  if (rang === 1) return 100;
  if (rang === 2) return 70;
  if (rang <= 4) return 50;
  if (rang <= 8) return 30;
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
  if (nombreMatchs === 1) return "Finale";
  if (nombreMatchs === 2) return "Demi-finales";
  if (nombreMatchs === 4) return "Quarts de finale";
  if (nombreMatchs === 8) return "Huitièmes de finale";
  if (nombreMatchs === 16) return "Seizièmes de finale";
  if (nombreMatchs === 32) return "Trente-deuxièmes de finale";
  return "Phase finale";
}

function LogoTourneo({ compact = false }: { compact?: boolean }) {
  return <TourneoBrand compact={compact} />;
}

export default function TournoiPage() {
  const params = useParams<{ id: string }>();

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
  const [messageCloud, setMessageCloud] = useState("");
  const [formatTournoi, setFormatTournoi] = useState<FormatTournoi>("complet");
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
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const videoScannerRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLienPartage(`${window.location.origin}/partage/${params.id}`);
    }

    async function initialiser() {
      if (params.id === "nouveau") {
        localStorage.removeItem(CLE);
        setNomTournoi("");
        setSport("multisport");
        setEquipes([]);
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
      }

      const chargerLocal = () => {
        const brut = localStorage.getItem(CLE);

        if (!brut) return false;

        try {
          const data = JSON.parse(brut);
          if (params.id === "nouveau") return false;

          const correspondAuTournoi =
            Boolean(data.tournoiId) && data.tournoiId === params.id;

          if (!correspondAuTournoi) return false;

          setNomTournoi(data.nomTournoi ?? "");
          setSport(data.sport ?? "multisport");
          setEquipes(data.equipes ?? []);
          setMatchs(data.matchs ?? []);
          setCree(Boolean(data.cree));
          setTournoiId(data.tournoiId ?? "");
          setFormatTournoi(data.formatTournoi ?? "complet");
          setModePoules(data.modePoules ?? "nombrePoules");
          setNombrePoules(data.nombrePoules ?? 2);
          setTaillePoules(data.taillePoules ?? 4);
          setQualifiesParPoule(data.qualifiesParPoule ?? 2);
          setPoules(data.poules ?? []);
          setMatchsPhaseFinale(data.matchsPhaseFinale ?? []);
          setMatchsValides(data.matchsValides ?? []);
          return true;
        } catch {
          localStorage.removeItem(CLE);
          return false;
        }
      };

      // On charge d'abord la copie locale pour que l'écran ne reste jamais bloqué.
      const localCharge = chargerLocal();

      // Si une copie locale correspond au tournoi, on l'affiche tout de suite.
      // La synchronisation cloud continue ensuite sans provoquer de flash de page.
      if (localCharge) setPret(true);

      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
        ]);

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
          setPret(true);
          return;
        }

        setMessageCloud(localCharge ? "Ouverture locale · synchronisation…" : "Chargement…");

        const cloudResult = await Promise.race([
          supabase
            .from("tournois")
            .select("id, nom, sport, donnees")
            .eq("user_id", user.id)
            .eq("id", params.id)
            .maybeSingle(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
        ]);

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
          const donnees = tournoiCloud.donnees ?? {};

          setTournoiId(tournoiCloud.id);
          setNomTournoi(tournoiCloud.nom ?? "");
          setSport(tournoiCloud.sport ?? donnees.sport ?? "multisport");
          setEquipes(donnees.equipes ?? []);
          setMatchs(donnees.matchs ?? []);
          setCree(Boolean(donnees.cree));
          setFormatTournoi(donnees.formatTournoi ?? "complet");
          setModePoules(donnees.modePoules ?? "nombrePoules");
          setNombrePoules(donnees.nombrePoules ?? 2);
          setTaillePoules(donnees.taillePoules ?? 4);
          setQualifiesParPoule(donnees.qualifiesParPoule ?? 2);
          setPoules(donnees.poules ?? []);
          setMatchsPhaseFinale(donnees.matchsPhaseFinale ?? []);
          setMatchsValides(donnees.matchsValides ?? []);
          setLienPartage(`${window.location.origin}/partage/${tournoiCloud.id}`);
          setMessageCloud("Synchronisé");
        } else if (!localCharge) {
          setMessageCloud("");
        }
      } catch (error) {
        console.error(error);
        setMessageCloud(localCharge ? "Mode local" : "Impossible de charger le tournoi");
      } finally {
        setPret(true);
      }
    }

    initialiser();
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
    if (!pret) return;

    localStorage.setItem(
      CLE,
      JSON.stringify({
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
      })
    );

    if (!tournoiId || !userId) return;

    const minuterie = window.setTimeout(async () => {
      setMessageCloud("Synchronisation…");

      const { error } = await supabase
        .from("tournois")
        .update({
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
          },
        })
        .eq("id", tournoiId)
        .eq("user_id", userId);

      if (error) {
        console.error(error);
        setMessageCloud("Erreur de synchronisation");
      } else {
        setMessageCloud("Synchronisé");
      }
    }, 500);

    return () => window.clearTimeout(minuterie);
  }, [
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
  ]);

  const matchsPoules = useMemo(
    () => matchs.filter((match) => match.id < SEUIL_PHASE_FINALE),
    [matchs]
  );

  const matchsFinale = useMemo(
    () => matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE),
    [matchs]
  );

  const classement = useMemo(
    () => calculerClassement(equipes, matchs),
    [equipes, matchs]
  );

  const podium = classement.slice(0, 3);
  const journees = useMemo(
    () => [...new Set(matchs.map((match) => match.journee))].sort((a, b) => a - b),
    [matchs]
  );

  const joues = matchs.filter(
    (match) => match.score1 !== "" && match.score2 !== ""
  ).length;

  const modificationParticipantsAutorisee = joues === 0;

  const nombrePoulesActuel = poules.length || Math.max(2, nombrePoules);
  const qualifiesTheoriques = nombrePoulesActuel * qualifiesParPoule;
  const totalMatchsTheorique =
    formatTournoi === "elimination"
      ? Math.max(0, equipes.length - 1)
      : formatTournoi === "poulesFinale" && estPuissanceDeDeux(qualifiesTheoriques)
      ? matchsPoules.length + qualifiesTheoriques - 1
      : matchs.length;

  const progression = totalMatchsTheorique
    ? Math.min(100, Math.round((joues / totalMatchsTheorique) * 100))
    : 0;

  function trouverEquipe(id: string) {
    return equipes.find((equipe) => equipe.id === id);
  }

  function genererPoules(equipesDepart: Equipe[]) {
    const melangees = melanger(equipesDepart);

    const nbPoules =
      modePoules === "nombrePoules"
        ? Math.max(2, Math.min(nombrePoules, melangees.length))
        : Math.max(2, Math.ceil(melangees.length / Math.max(2, taillePoules)));

    const poulesGenerees: Poule[] = Array.from({ length: nbPoules }, (_, index) => ({
      id: `poule-${index + 1}`,
      nom: `Poule ${String.fromCharCode(65 + index)}`,
      terrain: "",
      equipes: [],
    }));

    melangees.forEach((equipe, index) => {
      poulesGenerees[index % nbPoules].equipes.push(equipe);
    });

    return poulesGenerees;
  }

  function genererMatchsPoules(poulesSource: Poule[]) {
    let prochainId = 1;

    return poulesSource.flatMap((poule) =>
      genererMatchs(poule.equipes).map((match) => ({
        ...match,
        id: prochainId++,
      }))
    );
  }

  function genererTourElimination(
    equipesTour: Equipe[],
    journee: number,
    idDepart = SEUIL_PHASE_FINALE
  ) {
    return genererMatchsElimination(equipesTour).map((match, index) => ({
      ...match,
      id: idDepart + index,
      journee,
    }));
  }

  function validerConfiguration(equipesSource: Equipe[], format = formatTournoi) {
    if (equipesSource.length < 2) {
      return "Ajoute au moins deux participants.";
    }

    if (format === "elimination" && !estPuissanceDeDeux(equipesSource.length)) {
      return "Pour l’élimination directe, utilise 2, 4, 8, 16, 32 ou 64 participants.";
    }

    if (format === "poules" || format === "poulesFinale") {
      const poulesTest = genererPoules(equipesSource);
      const plusPetitePoule = Math.min(...poulesTest.map((poule) => poule.equipes.length));

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
    if (formatTournoi === "complet") {
      return {
        nouvellesPoules: [] as Poule[],
        nouveauxMatchs: genererMatchs(equipesSource),
      };
    }

    if (formatTournoi === "elimination") {
      const equipesMelangees = melanger(equipesSource);
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
      const matchsDeLaPoule = matchsSource.filter(
        (match) => ids.has(match.equipe1Id) && ids.has(match.equipe2Id)
      );
      const classementPoule = calculerClassement(poule.equipes, matchsDeLaPoule);

      return classementPoule.slice(0, qualifiesParPoule).map((ligne, rang) => ({
        equipe: ligne.equipe,
        pouleIndex,
        rang,
      }));
    });

    const restants = [...qualifies].sort(
      (a, b) => a.rang - b.rang || a.pouleIndex - b.pouleIndex
    );
    const ordre: Equipe[] = [];

    while (restants.length > 0) {
      const premier = restants.shift();
      if (!premier) break;

      let indexAdversaire = -1;
      for (let i = restants.length - 1; i >= 0; i -= 1) {
        if (restants[i].pouleIndex !== premier.pouleIndex) {
          indexAdversaire = i;
          break;
        }
      }

      if (indexAdversaire < 0) indexAdversaire = 0;
      const [adversaire] = restants.splice(indexAdversaire, 1);

      ordre.push(premier.equipe);
      if (adversaire) ordre.push(adversaire.equipe);
    }

    return ordre;
  }

  function enregistrerEquipe(equipe: Equipe) {
    const doublon = equipes.some(
      (item) =>
        item.id !== equipeAModifier?.id &&
        item.nom.trim().toLowerCase() === equipe.nom.trim().toLowerCase()
    );

    if (doublon) {
      alert("Un participant porte déjà ce nom.");
      return;
    }

    const nouvellesEquipes = equipeAModifier
      ? equipes.map((item) =>
          item.id === equipeAModifier.id ? { ...equipe, id: equipeAModifier.id } : item
        )
      : [...equipes, equipe];

    setEquipes(nouvellesEquipes);

    if (cree && modificationParticipantsAutorisee) {
      setMatchs([]);
      setPoules([]);
      setMessageCloud("Participants modifiés · recalcule le tournoi pour appliquer la nouvelle structure");
      setOnglet("participants");
    }

    setModalOuvert(false);
    setEquipeAModifier(null);
  }

  async function lancerTournoi() {
    if (!nomTournoi.trim()) {
      alert("Ajoute un nom au tournoi.");
      return;
    }

    const erreurConfiguration = validerConfiguration(equipes);
    if (erreurConfiguration) {
      alert(erreurConfiguration);
      return;
    }

    if (!userId) {
      alert("Utilisateur non connecté.");
      window.location.href = "/login";
      return;
    }

    const { nouvellesPoules, nouveauxMatchs } = construireStructure(equipes);

    setMessageCloud("Création du tournoi…");

    const { data, error } = await supabase
      .from("tournois")
      .insert({
        nom: nomTournoi.trim(),
        sport,
        user_id: userId,
        donnees: {
          sport,
          equipes,
          matchs: nouveauxMatchs,
          cree: true,
          formatTournoi,
          modePoules,
          nombrePoules,
          taillePoules,
          qualifiesParPoule,
          poules: nouvellesPoules,
          matchsPhaseFinale: nouveauxMatchs.filter(
            (match) => match.id >= SEUIL_PHASE_FINALE
          ),
          matchsValides: [],
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setMessageCloud("Erreur lors de la création");
      alert(error.message);
      return;
    }

    setPoules(nouvellesPoules);
    setMatchs(nouveauxMatchs);
    setTournoiId(data.id);
    setCree(true);
    setOnglet("matchs");
    setLienPartage(`${window.location.origin}/partage/${data.id}`);
    window.history.replaceState({}, "", `/tournoi/${data.id}`);
    setMessageCloud("Synchronisé");
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

  function changerScore(
    id: number,
    champ: "score1" | "score2",
    valeur: string
  ) {
    if (matchsValides.includes(id)) return;
    setMatchs((actuels) =>
      actuels.map((match) =>
        match.id === id ? { ...match, [champ]: valeur } : match
      )
    );
  }

  function avancerTournoiSiPossible(matchsSource: Match[], validesSource: number[]) {
    if (formatTournoi === "complet" || formatTournoi === "poules") return matchsSource;

    if (formatTournoi === "poulesFinale") {
      const poulesSource = matchsSource.filter((match) => match.id < SEUIL_PHASE_FINALE);
      const finaleExistante = matchsSource.filter((match) => match.id >= SEUIL_PHASE_FINALE);
      const poulesTerminees =
        poulesSource.length > 0 &&
        poulesSource.every(
          (match) =>
            match.score1 !== "" &&
            match.score2 !== "" &&
            validesSource.includes(match.id)
        );

      if (finaleExistante.length === 0 && poulesTerminees) {
        const qualifies = obtenirQualifiesCroises(poulesSource);
        if (!estPuissanceDeDeux(qualifies.length)) return matchsSource;
        const derniereJourneePoules = Math.max(...poulesSource.map((match) => match.journee));
        return [...matchsSource, ...genererTourElimination(qualifies, derniereJourneePoules + 1)];
      }
    }

    const elimination = matchsSource.filter((match) =>
      formatTournoi === "elimination" ? true : match.id >= SEUIL_PHASE_FINALE
    );
    if (elimination.length === 0) return matchsSource;

    const derniereJournee = Math.max(...elimination.map((match) => match.journee));
    const tour = elimination.filter((match) => match.journee === derniereJournee);
    const tourValide =
      tour.length > 0 &&
      tour.every(
        (match) =>
          match.score1 !== "" &&
          match.score2 !== "" &&
          Number(match.score1) !== Number(match.score2) &&
          validesSource.includes(match.id)
      );

    if (!tourValide) return matchsSource;

    const vainqueurs = tour
      .map((match) => {
        const gagnantId =
          Number(match.score1) > Number(match.score2)
            ? match.equipe1Id
            : match.equipe2Id;
        return equipes.find((equipe) => equipe.id === gagnantId);
      })
      .filter((equipe): equipe is Equipe => Boolean(equipe));

    if (vainqueurs.length <= 1) return matchsSource;

    const existe = elimination.some((match) => match.journee === derniereJournee + 1);
    if (existe) return matchsSource;

    const prochainId = Math.max(
      SEUIL_PHASE_FINALE,
      ...matchsSource.map((match) => match.id + 1)
    );
    return [
      ...matchsSource,
      ...genererTourElimination(vainqueurs, derniereJournee + 1, prochainId),
    ];
  }

  function validerScore(match: Match) {
    if (match.score1 === "" || match.score2 === "") {
      alert("Saisissez les deux scores avant de valider.");
      return;
    }

    if (
      (formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE) &&
      Number(match.score1) === Number(match.score2)
    ) {
      alert("Un vainqueur est nécessaire pour ce match.");
      return;
    }

    const nouveauxValides = [...new Set([...matchsValides, match.id])];
    setMatchsValides(nouveauxValides);
    setMatchs((actuels) => avancerTournoiSiPossible(actuels, nouveauxValides));
  }

  function enregistrerScoreAutomatiquement(matchId: number) {
    const match = matchs.find((item) => item.id === matchId);
    if (!match || matchsValides.includes(matchId)) return;
    if (match.score1 === "" || match.score2 === "") return;

    if (
      (formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE) &&
      Number(match.score1) === Number(match.score2)
    ) {
      return;
    }

    validerScore(match);
  }

  function corrigerScore(match: Match) {
    const toursSuivants = matchs.some((item) => item.journee > match.journee);
    if (toursSuivants && (formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE)) {
      if (!confirm("Corriger ce résultat supprimera les tours générés après celui-ci. Continuer ?")) return;
      setMatchs((actuels) => actuels.filter((item) => item.journee <= match.journee));
      setMatchsValides((actuels) =>
        actuels.filter((id) => {
          const cible = matchs.find((item) => item.id === id);
          return !cible || cible.journee <= match.journee;
        }).filter((id) => id !== match.id)
      );
      return;
    }

    setMatchsValides((actuels) => actuels.filter((id) => id !== match.id));
  }

  function scoreModifiable(match: Match) {
    return !matchsValides.includes(match.id);
  }

  async function ajouterMonProfil() {
    if (!userId) return;
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
    if (!code) return false;

    setMessageCodeJoueur("Recherche du joueur…");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, player_code, avatar_url, favorite_color")
      .eq("player_code", code)
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
    if (!brut) return "";

    try {
      const objet = JSON.parse(brut);
      const possible = objet?.player_code ?? objet?.playerCode ?? objet?.code;
      if (typeof possible === "string") return possible.trim().toUpperCase();
    } catch {
      // Le QR peut être un code simple ou une URL.
    }

    try {
      const url = new URL(brut);
      const possible =
        url.searchParams.get("player_code") ||
        url.searchParams.get("playerCode") ||
        url.searchParams.get("code");
      if (possible) return possible.trim().toUpperCase();
    } catch {
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
        if (!actif || !scannerStreamRef.current || !videoScannerRef.current) return;

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
              if (!ajoute) setMessageCodeJoueur(`QR lu : ${code}`);
              return;
            }
          }
        } catch {
          // On continue la détection sur l'image suivante.
        }

        window.setTimeout(scanner, 250);
      };

      scanner();
    } catch {
      setScannerMessage("Accès caméra refusé ou indisponible. Autorisez la caméra ou utilisez le code joueur.");
    }
  }

  async function seDeconnecter() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Impossible de se déconnecter pour le moment.");
      return;
    }

    window.location.href = "/login";
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lienPartage);
      setMessageCloud("Lien copié");
    } catch {
      prompt("Copie ce lien :", lienPartage);
    }
  }


  function choisirPhotoPodium(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    if (!fichier) return;

    if (!fichier.type.startsWith("image/")) {
      alert("Choisissez une image.");
      return;
    }

    const lecteur = new FileReader();
    lecteur.onload = () => {
      if (typeof lecteur.result === "string") setPodiumPhotoUrl(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
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

  function exporterPDF() {
    window.print();
  }

  async function supprimerTournoi() {
    if (!confirm("Supprimer définitivement ce tournoi ?")) return;

    if (tournoiId) {
      const { error } = await supabase.from("tournois").delete().eq("id", tournoiId);

      if (error) {
        console.error(error);
        alert("La suppression dans le cloud a échoué.");
        return;
      }
    }

    localStorage.removeItem(CLE);
    window.location.href = "/dashboard";
  }

  function titreJournee(journee: number) {
    const matchsJournee = matchs.filter((match) => match.journee === journee);
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
    const matchsDeLaPoule = matchsPoules.filter(
      (match) => ids.has(match.equipe1Id) && ids.has(match.equipe2Id)
    );
    const lignes = calculerClassement(poule.equipes, matchsDeLaPoule);

    return (
      <div key={poule.id} style={styles.poolCard}>
        <div style={styles.poolHeader}>
          <div>
            <span style={styles.eyebrow}>{poule.nom}</span>
            <h3 style={styles.poolTitle}>{poule.terrain || "Terrain à définir"}</h3>
          </div>
          <span style={styles.pill}>{poule.equipes.length} équipes</span>
        </div>

        <div className="tourneo-ranking-table" style={styles.tableWrap}>
          <table style={{ ...styles.table, minWidth: 520 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Équipe</th>
                <th>MJ</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>Diff.</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, index) => (
                <tr key={ligne.equipe.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div style={styles.teamCell}>
                      <TeamAvatar equipe={ligne.equipe} taille={34} />
                      <strong>{ligne.equipe.nom}</strong>
                    </div>
                  </td>
                  <td>{ligne.mj}</td>
                  <td>{ligne.v}</td>
                  <td>{ligne.n}</td>
                  <td>{ligne.d}</td>
                  <td>{ligne.diff > 0 ? `+${ligne.diff}` : ligne.diff}</td>
                  <td><strong>{ligne.pts}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renduClassementElimination() {
    const matchsElimination = matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE);

    if (matchsElimination.length === 0) return null;

    const journeesElimination = [...new Set(matchsElimination.map((match) => match.journee))].sort((a, b) => a - b);
    const derniereJournee = journeesElimination[journeesElimination.length - 1];
    const finale = matchsElimination.find((match) => match.journee === derniereJournee);

    const finaleTerminee =
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
          .filter(
            (match) =>
              match.score1 !== "" &&
              match.score2 !== "" &&
              Number(match.score1) !== Number(match.score2)
          )
          .map((match) =>
            Number(match.score1) > Number(match.score2)
              ? match.equipe2Id
              : match.equipe1Id
          )
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

    return (
      <section style={styles.card}>
        <div style={styles.formHeader}>
          <div>
            <span style={styles.eyebrow}>Parcours final</span>
            <h2 style={styles.sectionTitle}>Classement de l’élimination</h2>
          </div>
          <span style={styles.pill}>{equipes.length} participants</span>
        </div>

        <div style={styles.eliminationRanking}>
          {champion && (
            <div style={{ ...styles.eliminationRankRow, ...styles.eliminationRankWinner }}>
              <span style={styles.eliminationRank}>1</span>
              <TeamAvatar equipe={champion} taille={40} />
              <strong>{champion.nom}</strong>
              <span style={styles.eliminationStatus}>Champion</span>
            </div>
          )}

          {finaliste && (
            <div style={styles.eliminationRankRow}>
              <span style={styles.eliminationRank}>2</span>
              <TeamAvatar equipe={finaliste} taille={40} />
              <strong>{finaliste.nom}</strong>
              <span style={styles.eliminationStatus}>Finaliste</span>
            </div>
          )}

          {groupes.map((groupe) => (
            <div key={groupe.journee} style={styles.eliminationGroup}>
              <div style={styles.eliminationGroupTitle}>Éliminés en {groupe.titre.toLowerCase()}</div>
              <div style={styles.eliminationGroupTeams}>
                {groupe.equipes.filter((equipe): equipe is Equipe => Boolean(equipe)).map((equipe) => (
                  <div key={equipe.id} style={styles.eliminationChip}>
                    <TeamAvatar equipe={equipe} taille={30} />
                    <span>{equipe.nom}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renduResultatFinal() {
    const source = formatTournoi === "elimination" ? matchs : matchsFinale;

    if (source.length === 0) {
      return (
        <section style={styles.card}>
          <span style={styles.eyebrow}>Phase finale</span>
          <h2 style={styles.sectionTitle}>À venir</h2>
          <p style={styles.muted}>La phase finale sera générée automatiquement lorsque les conditions seront remplies.</p>
        </section>
      );
    }

    const derniereJournee = Math.max(...source.map((match) => match.journee));
    const finale = source.find((match) => match.journee === derniereJournee);

    if (!finale || finale.score1 === "" || finale.score2 === "" || Number(finale.score1) === Number(finale.score2)) {
      return (
        <section style={styles.card}>
          <span style={styles.eyebrow}>Phase finale</span>
          <h2 style={styles.sectionTitle}>Tournoi en cours</h2>
          <p style={styles.muted}>Le champion apparaîtra ici dès que la finale sera terminée.</p>
        </section>
      );
    }

    const equipe1 = trouverEquipe(finale.equipe1Id);
    const equipe2 = trouverEquipe(finale.equipe2Id);
    if (!equipe1 || !equipe2) return null;

    const gagnant = Number(finale.score1) > Number(finale.score2) ? equipe1 : equipe2;
    const finaliste = Number(finale.score1) > Number(finale.score2) ? equipe2 : equipe1;

    return (
      <section style={styles.card}>
        <span style={styles.eyebrow}>Résultat final</span>
        <h2 style={styles.sectionTitle}>Champion de {nomTournoi}</h2>
        <div style={styles.finalResult}>
          <div style={styles.finalistCard}>
            <TeamAvatar equipe={finaliste} taille={58} />
            <span style={styles.muted}>Finaliste</span>
            <strong style={styles.finalName}>{finaliste.nom}</strong>
          </div>
          <div style={styles.championCard}>
            <div style={styles.championLabel}>CHAMPION</div>
            <TeamAvatar equipe={gagnant} taille={74} />
            <strong style={styles.championName}>{gagnant.nom}</strong>
          </div>
        </div>
      </section>
    );
  }

  useEffect(() => {
    if (!tournoiId || !userId || !matchs.length) return;
    const matchsTermines = matchs.filter((match) => match.score1 !== "" && match.score2 !== "").length;
    if (matchsTermines !== matchs.length) return;

    async function synchroniserPalmares() {
      const ids = equipes.map((equipe) => equipe.id).filter(Boolean);
      if (!ids.length) return;

      const { data: profils } = await supabase.from("profiles").select("id").in("id", ids);
      if (!profils?.length) return;
      const profilsIds = new Set(profils.map((profil) => profil.id));

      const rangElimination = (equipeId: string) => {
        if (!(formatTournoi === "elimination" || formatTournoi === "poulesFinale")) {
          const index = classement.findIndex((ligne) => ligne.equipe.id === equipeId);
          return index >= 0 ? index + 1 : equipes.length;
        }

        const matchsFinaux = formatTournoi === "poulesFinale"
          ? matchs.filter((match) => match.id >= SEUIL_PHASE_FINALE)
          : matchs;
        if (!matchsFinaux.length) return equipes.length;
        const derniereJournee = Math.max(...matchsFinaux.map((match) => match.journee));
        const finale = matchsFinaux.find((match) => match.journee === derniereJournee);
        if (finale && finale.score1 !== "" && finale.score2 !== "") {
          const gagnant = Number(finale.score1) > Number(finale.score2) ? finale.equipe1Id : finale.equipe2Id;
          const finaliste = gagnant === finale.equipe1Id ? finale.equipe2Id : finale.equipe1Id;
          if (equipeId === gagnant) return 1;
          if (equipeId === finaliste) return 2;
        }
        const dernierMatch = [...matchsFinaux]
          .filter((match) => match.equipe1Id === equipeId || match.equipe2Id === equipeId)
          .sort((a, b) => b.journee - a.journee)[0];
        if (!dernierMatch) return equipes.length;
        const matchsDuTour = matchsFinaux.filter((match) => match.journee === dernierMatch.journee).length;
        return matchsDuTour + 1;
      };

      const lignes = equipes
        .filter((equipe) => profilsIds.has(equipe.id))
        .map((equipe) => {
          const placement = rangElimination(equipe.id);
          return {
            tournament_id: tournoiId,
            profile_id: equipe.id,
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
  }, [tournoiId, userId, matchs, equipes, formatTournoi, classement, nomTournoi, sport]);

  if (!pret) {
    return (
      <main style={styles.page}>
        <div style={styles.loaderCard}>
          <LogoTourneo />
          <span style={styles.muted}>Chargement de votre tournoi…</span>
        </div>
      </main>
    );
  }

  if (!cree) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <TourneoNav
            active="tournoi"
            onLogout={seDeconnecter}
            primaryLabel="Mes tournois"
            primaryHref="/dashboard"
          />

          <section className="tourneo-create-card" style={{ ...styles.formCard, maxWidth: 900, margin: "0 auto" }}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>Nouveau tournoi</span>
                <h1 style={{ ...styles.heroTitle, marginBottom: 8 }}>Créer votre tournoi</h1>
                <p style={styles.heroText}>Deux étapes simples : configurez, puis ajoutez les participants.</p>
              </div>
              <span style={styles.pill}>{equipes.length} participant(s)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: 6, borderRadius: 16, background: "#090E17", margin: "18px 0" }}>
              <button
                style={{ ...styles.ghostButton, ...(creationEtape === "configuration" ? styles.tabActive : {}) }}
                onClick={() => setCreationEtape("configuration")}
              >
                1 · Configuration
              </button>
              <button
                style={{ ...styles.ghostButton, ...(creationEtape === "participants" ? styles.tabActive : {}) }}
                onClick={() => setCreationEtape("participants")}
              >
                2 · Participants
              </button>
            </div>

            {creationEtape === "configuration" ? (
              <>
                <label style={styles.label}>Nom du tournoi</label>
                <input
                  style={styles.input}
                  value={nomTournoi}
                  onChange={(event) => setNomTournoi(capitaliserNom(event.target.value))}
                  placeholder="Ex. Tournoi été 2026"
                />

                <div style={styles.twoColumns}>
                  <div>
                    <label style={styles.label}>Sport</label>
                    <select style={styles.input} value={sport} onChange={(event) => setSport(event.target.value)}>
                      {Object.entries(LIBELLES_SPORT).map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Format</label>
                    <select
                      style={styles.input}
                      value={formatTournoi}
                      onChange={(event) => setFormatTournoi(event.target.value as FormatTournoi)}
                    >
                      {Object.entries(LIBELLES_FORMAT).map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                    <div style={styles.formatExplanation}>
                      <strong>{LIBELLES_FORMAT[formatTournoi]}</strong>
                      <span>{EXPLICATIONS_FORMAT[formatTournoi]}</span>
                    </div>
                  </div>
                </div>

                {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (
                  <div style={styles.configBox}>
                    <label style={styles.label}>Organisation des poules</label>
                    <select
                      style={styles.input}
                      value={modePoules}
                      onChange={(event) => setModePoules(event.target.value as ModePoules)}
                    >
                      <option value="nombrePoules">Choisir le nombre de poules</option>
                      <option value="taillePoules">Choisir les participants par poule</option>
                    </select>

                    <div style={styles.twoColumns}>
                      <div>
                        <label style={styles.label}>
                          {modePoules === "nombrePoules" ? "Nombre de poules" : "Participants par poule"}
                        </label>
                        <input
                          style={styles.input}
                          type="number"
                          min="2"
                          value={modePoules === "nombrePoules" ? nombrePoules : taillePoules}
                          onChange={(event) =>
                            modePoules === "nombrePoules"
                              ? setNombrePoules(Number(event.target.value))
                              : setTaillePoules(Number(event.target.value))
                          }
                        />
                      </div>
                      {formatTournoi === "poulesFinale" && (
                        <div>
                          <label style={styles.label}>Qualifiés par poule</label>
                          <input
                            style={styles.input}
                            type="number"
                            min="1"
                            value={qualifiesParPoule}
                            onChange={(event) => setQualifiesParPoule(Number(event.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button style={styles.primaryButton} onClick={() => setCreationEtape("participants")}>
                  Continuer vers les participants →
                </button>
              </>
            ) : (
              <>
                <div className="tourneo-participants-header-mobile" style={styles.participantsHeader}>
                  <div>
                    <span style={styles.eyebrow}>Participants</span>
                    <h2 style={styles.sectionTitle}>Équipes / joueurs</h2>
                  </div>
                </div>

                <button
                  className="tourneo-add-player-main"
                  style={styles.primaryButton}
                  onClick={() => {
                    setEquipeAModifier(null);
                    setModalOuvert(true);
                  }}
                >
                  + Ajouter un joueur sans profil
                </button>

                <div style={styles.selfAddLine}>
                  <span style={styles.selfAddHint}>Votre propre profil ?</span>
                  <button
                    className="tourneo-add-self"
                    style={styles.selfAddButton}
                    disabled={ajoutMoiEnCours}
                    onClick={ajouterMonProfil}
                  >
                    {ajoutMoiEnCours ? "Ajout…" : "M’ajouter moi-même"}
                  </button>
                </div>

                <div className="tourneo-player-profile-box" style={styles.playerCodeBox}>
                  <div style={{ display: "grid", gap: 5 }}>
                    <strong>Ajouter un joueur avec son profil Tourneo</strong>
                    <span style={styles.muted}>
                      Saisissez son code joueur ou scannez directement le QR affiché sur son profil.
                    </span>
                  </div>

                  <div style={styles.playerCodeActions}>
                    <input
                      style={{ ...styles.input, margin: 0 }}
                      value={codeJoueur}
                      onChange={(event) => setCodeJoueur(event.target.value)}
                      placeholder="Ex. TRN-12AB-34CD"
                    />
                    <button style={styles.secondaryButton} onClick={ajouterViaCodeTourneo}>Ajouter par code</button>
                  </div>

                  <button className="tourneo-scan-player" style={styles.scanButton} onClick={ouvrirScanner}>
                    ⌗ Scanner le QR du joueur
                  </button>

                  {messageCodeJoueur && <span style={styles.statusLine}>{messageCodeJoueur}</span>}
                </div>

                <div style={styles.teamList}>
                  {equipes.length === 0 ? (
                    <div style={styles.emptyState}>Ajoutez au moins deux participants pour commencer.</div>
                  ) : (
                    equipes.map((equipe) => (
                      <TeamCard
                        key={equipe.id}
                        equipe={equipe}
                        onModifier={() => {
                          setEquipeAModifier(equipe);
                          setModalOuvert(true);
                        }}
                        onSupprimer={() => setEquipes((actuelles) => actuelles.filter((item) => item.id !== equipe.id))}
                      />
                    ))
                  )}
                </div>

                <button style={styles.primaryButton} onClick={lancerTournoi}>Créer le tournoi</button>
                <button style={{ ...styles.ghostButton, width: "100%", marginTop: 8 }} onClick={() => setCreationEtape("configuration")}>
                  ← Revenir à la configuration
                </button>
                {messageCloud && <div style={styles.statusLine}>{messageCloud}</div>}
              </>
            )}
          </section>
        </div>

        {scannerOuvert && (
          <div style={styles.modalBackdrop} onClick={fermerScanner}>
            <section style={styles.scannerModal} onClick={(event) => event.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <span style={styles.eyebrow}>Profil Tourneo</span>
                  <h2 style={styles.sectionTitle}>Scanner le QR joueur</h2>
                </div>
                <button style={styles.modalClose} onClick={fermerScanner}>×</button>
              </div>
              <div style={styles.scannerViewport}>
                <video ref={videoScannerRef} playsInline muted style={styles.scannerVideo} />
                <div style={styles.scannerFrame} />
              </div>
              <p style={styles.scannerHelp}>Placez le QR personnel du joueur au centre.</p>
              {scannerMessage && <div style={styles.inlineWarning}>{scannerMessage}</div>}
              <button style={styles.ghostWide} onClick={fermerScanner}>Annuler</button>
            </section>
          </div>
        )}

        <TeamModal
          ouvert={modalOuvert}
          equipeAModifier={equipeAModifier}
          onFermer={() => {
            setModalOuvert(false);
            setEquipeAModifier(null);
          }}
          onAjouter={enregistrerEquipe}
        />
      </main>
    );
  }

  return (
    <main style={styles.page}>

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

          .tourneo-progress-card, .tourneo-sponsor-card {
            border-radius: 18px !important;
          }

          .tourneo-sponsor-card {
            padding: 13px 14px !important;
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
        <TourneoNav
          active="tournoi"
          onLogout={seDeconnecter}
        />

        <section className="tourneo-tournament-header" style={styles.tournamentHeader}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.metaRow}>
              <span style={styles.formatBadge}>{LIBELLES_FORMAT[formatTournoi]}</span>
              <span style={styles.metaText}>{LIBELLES_SPORT[sport] ?? sport}</span>
            </div>
            <h1 style={styles.tournamentTitle}>{nomTournoi}</h1>
            <p style={styles.tournamentSubtitle}>
              {equipes.length} participants · {joues}/{totalMatchsTheorique || matchs.length} matchs terminés
            </p>
            {messageCloud && <div style={styles.syncBadge}><span style={styles.syncDot} />{messageCloud}</div>}
          </div>

          <div className="tourneo-header-actions" style={styles.headerActions}>
            <button style={styles.secondaryButton} onClick={partagerTournoi}>Partager</button>
            <button style={styles.secondaryButton} onClick={() => setQrOuvert(true)}>QR code</button>
            <button style={styles.secondaryButton} onClick={exporterPDF}>Exporter</button>
            {modificationParticipantsAutorisee && (
              <button style={styles.secondaryButton} onClick={() => setOnglet("participants")}>Modifier</button>
            )}
            <button style={styles.primarySmall} onClick={() => (window.location.href = "/tournoi/nouveau")}>Nouveau tournoi</button>
          </div>
        </section>

        <section className="tourneo-progress-card" style={styles.progressCard}>
          <div style={styles.progressTop}>
            <div>
              <span style={styles.eyebrow}>Progression</span>
              <strong style={styles.progressTitle}>{progression}% terminé</strong>
            </div>
            <span style={styles.progressNumbers}>{joues} / {totalMatchsTheorique || matchs.length}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${progression}%` }} />
          </div>
        </section>

        <section className="tourneo-sponsor-card" style={styles.sponsorCard}>
          <div>
            <span style={styles.eyebrow}>Espace partenaire</span>
            <strong style={styles.sponsorTitle}>{partenairePourSport(sport)}</strong>
            <span style={styles.muted}>Emplacement publicitaire contextuel prévu pour la monétisation. Aucun partenariat n’est actuellement revendiqué.</span>
          </div>
          <span style={styles.sponsorBadge}>{LIBELLES_SPORT[sport] ?? sport}</span>
        </section>

        <nav className="tourneo-tabs" style={styles.nav}>
          {([
            ["matchs", "Matchs"],
            ["classement", "Classement"],
            ["statistiques", "Statistiques"],
          ] as [Onglet, string][]).map(([value, label]) => (
            <button
              key={value}
              style={{ ...styles.tab, ...(onglet === value ? styles.tabActive : {}) }}
              onClick={() => setOnglet(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        {onglet === "participants" && (
          <section style={styles.card}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>Configuration</span>
                <h2 style={styles.sectionTitle}>Modifier le tournoi</h2>
                <p style={styles.muted}>Disponible tant qu’aucun résultat n’a été saisi.</p>
              </div>
              <button style={styles.ghostButton} onClick={() => setOnglet("matchs")}>Fermer</button>
            </div>

            <div style={styles.twoColumns}>
              <div>
                <label style={styles.label}>Format</label>
                <select
                  style={styles.input}
                  value={formatTournoi}
                  onChange={(event) => {
                    setFormatTournoi(event.target.value as FormatTournoi);
                    setMatchs([]);
                    setPoules([]);
                  }}
                >
                  {Object.entries(LIBELLES_FORMAT).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Sport</label>
                <select style={styles.input} value={sport} onChange={(event) => setSport(event.target.value)}>
                  {Object.entries(LIBELLES_SPORT).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (
              <div style={styles.configBox}>
                <label style={styles.label}>Organisation des poules</label>
                <select style={styles.input} value={modePoules} onChange={(event) => setModePoules(event.target.value as ModePoules)}>
                  <option value="nombrePoules">Choisir le nombre de poules</option>
                  <option value="taillePoules">Choisir les participants par poule</option>
                </select>
                <div style={styles.twoColumns}>
                  <div>
                    <label style={styles.label}>{modePoules === "nombrePoules" ? "Nombre de poules" : "Participants par poule"}</label>
                    <input
                      style={styles.input}
                      type="number"
                      min="2"
                      value={modePoules === "nombrePoules" ? nombrePoules : taillePoules}
                      onChange={(event) =>
                        modePoules === "nombrePoules"
                          ? setNombrePoules(Number(event.target.value))
                          : setTaillePoules(Number(event.target.value))
                      }
                    />
                  </div>
                  {formatTournoi === "poulesFinale" && (
                    <div>
                      <label style={styles.label}>Qualifiés par poule</label>
                      <input
                        style={styles.input}
                        type="number"
                        min="1"
                        value={qualifiesParPoule}
                        onChange={(event) => setQualifiesParPoule(Number(event.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.participantsHeader}>
              <div>
                <span style={styles.eyebrow}>Participants</span>
                <h3 style={styles.smallTitle}>{equipes.length} équipe(s) / joueur(s)</h3>
              </div>
              <button
                style={styles.secondaryButton}
                onClick={() => {
                  setEquipeAModifier(null);
                  setModalOuvert(true);
                }}
              >
                Ajouter
              </button>
            </div>

            <div style={styles.playerCodeBox}>
              <strong>Ajouter un joueur avec son profil Tourneo</strong>
              <span style={styles.muted}>Par code joueur ou en scannant son QR personnel.</span>
              <div style={styles.playerCodeActions}>
                <input style={{ ...styles.input, margin: 0 }} value={codeJoueur} onChange={(event) => setCodeJoueur(event.target.value)} placeholder="Code joueur" />
                <button style={styles.secondaryButton} onClick={ajouterViaCodeTourneo}>Ajouter par code</button>
              </div>
              <button style={styles.scanButton} onClick={ouvrirScanner}>⌗ Scanner le QR du joueur</button>
              {messageCodeJoueur && <span style={styles.statusLine}>{messageCodeJoueur}</span>}
            </div>

            <div style={styles.teamList}>
              {equipes.map((equipe) => (
                <TeamCard
                  key={equipe.id}
                  equipe={equipe}
                  onModifier={() => {
                    setEquipeAModifier(equipe);
                    setModalOuvert(true);
                  }}
                  onSupprimer={() => {
                    setEquipes((actuelles) => actuelles.filter((item) => item.id !== equipe.id));
                    setMatchs([]);
                    setPoules([]);
                  }}
                />
              ))}
            </div>

            <button style={styles.primaryButton} onClick={recalculerTournoi}>Enregistrer et recalculer</button>
            <button style={styles.dangerButton} onClick={supprimerTournoi}>Supprimer ce tournoi</button>
          </section>
        )}

        {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && poules.length > 0 && onglet === "matchs" && (
          <section style={styles.card}>
            <div style={styles.formHeader}>
              <div>
                <span style={styles.eyebrow}>Répartition</span>
                <h2 style={styles.sectionTitle}>Poules</h2>
              </div>
              <span style={styles.pill}>{poules.length} poules</span>
            </div>

            <div style={styles.poolGrid}>
              {poules.map((poule) => (
                <div key={poule.id} style={styles.poolCard}>
                  <div style={styles.poolHeader}>
                    <strong style={styles.poolTitle}>{poule.nom}</strong>
                    <span style={styles.pill}>{poule.equipes.length}</span>
                  </div>

                  {modificationParticipantsAutorisee ? (
                    <input
                      style={{ ...styles.input, marginBottom: 14 }}
                      placeholder="Terrain / table / piste"
                      value={poule.terrain}
                      onChange={(event) => {
                        const terrain = event.target.value;
                        setPoules((actuelles) =>
                          actuelles.map((item) => item.id === poule.id ? { ...item, terrain } : item)
                        );
                      }}
                    />
                  ) : poule.terrain ? (
                    <span style={styles.terrainLabel}>{poule.terrain}</span>
                  ) : null}

                  <div style={styles.poolTeams}>
                    {poule.equipes.map((equipe) => (
                      <div key={equipe.id} style={styles.poolTeam}>
                        <TeamAvatar equipe={equipe} taille={32} />
                        <strong>{equipe.nom}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {onglet === "matchs" && journees.map((journee, journeeIndex) => {
          const matchsJournee = matchs.filter((match) => match.journee === journee);

          return (
            <div key={journee}>
              <section style={styles.card}>
              <div style={styles.roundHeader}>
                <div>
                  <span style={styles.eyebrow}>{formatTournoi === "complet" ? "Calendrier" : "Tournoi"}</span>
                  <h2 style={styles.sectionTitle}>{titreJournee(journee)}</h2>
                </div>
                <span style={styles.pill}>{matchsJournee.length} match(s)</span>
              </div>

              <div style={styles.matchList}>
                {matchsJournee.map((match) => {
                  const equipe1 = trouverEquipe(match.equipe1Id);
                  const equipe2 = trouverEquipe(match.equipe2Id);
                  const pouleDuMatch = poules.find(
                    (poule) =>
                      poule.equipes.some((equipe) => equipe.id === match.equipe1Id) &&
                      poule.equipes.some((equipe) => equipe.id === match.equipe2Id)
                  );
                  const fini = match.score1 !== "" && match.score2 !== "";
                  const nulInterdit =
                    fini &&
                    Number(match.score1) === Number(match.score2) &&
                    (formatTournoi === "elimination" || match.id >= SEUIL_PHASE_FINALE);
                  const editable = scoreModifiable(match);

                  return (
                    <article key={match.id} style={{ ...styles.matchCard, ...(fini ? styles.matchDone : {}) }}>
                      {pouleDuMatch && match.id < SEUIL_PHASE_FINALE && (
                        <div style={styles.matchMeta}>
                          <span>{pouleDuMatch.nom}</span>
                          {pouleDuMatch.terrain && <span>{pouleDuMatch.terrain}</span>}
                        </div>
                      )}

                      <div style={styles.matchGrid}>
                        <div style={styles.teamLeft}>
                          {equipe1 && <TeamAvatar equipe={equipe1} taille={38} />}
                          <strong>{equipe1?.nom ?? "Participant supprimé"}</strong>
                        </div>

                        <input
                          style={{ ...styles.scoreInput, ...(editable ? {} : styles.scoreLocked) }}
                          type="number"
                          min="0"
                          value={match.score1}
                          disabled={!editable}
                          onChange={(event) => changerScore(match.id, "score1", event.target.value)}
                          onBlur={() => enregistrerScoreAutomatiquement(match.id)}
                        />

                        <span style={styles.scoreSeparator}>–</span>

                        <input
                          style={{ ...styles.scoreInput, ...(editable ? {} : styles.scoreLocked) }}
                          type="number"
                          min="0"
                          value={match.score2}
                          disabled={!editable}
                          onChange={(event) => changerScore(match.id, "score2", event.target.value)}
                          onBlur={() => enregistrerScoreAutomatiquement(match.id)}
                        />

                        <div style={styles.teamRight}>
                          <strong>{equipe2?.nom ?? "Participant supprimé"}</strong>
                          {equipe2 && <TeamAvatar equipe={equipe2} taille={38} />}
                        </div>
                      </div>

                      {nulInterdit && <div style={styles.inlineWarning}>Un vainqueur est requis pour poursuivre la phase finale.</div>}
                      {matchsValides.includes(match.id) && (
                        <div className="tourneo-score-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <span style={{ ...styles.pill, color: "#9EF4C5" }}>Enregistré</span>
                          <button style={styles.ghostButton} onClick={() => corrigerScore(match)}>Modifier le résultat</button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
            </div>
          );
        })}

        {onglet === "classement" && (
          <>
            {formatTournoi === "complet" && (
              <>
                {podium.length >= 3 && (
                  <section style={styles.card}>
                    <span style={styles.eyebrow}>{joues === matchs.length && matchs.length > 0 ? "Résultat" : "Classement provisoire"}</span>
                    <h2 style={styles.sectionTitle}>Podium</h2>
                    <div className="tourneo-podium-stage" style={styles.podiumStage}>
                      {[podium[1], podium[0], podium[2]].map((ligne, index) => {
                        const rang = index === 0 ? 2 : index === 1 ? 1 : 3;
                        const hauteur = rang === 1 ? 150 : rang === 2 ? 118 : 96;
                        const medaille = rang === 1 ? "🥇" : rang === 2 ? "🥈" : "🥉";

                        return (
                          <div
                            key={ligne.equipe.id}
                            style={{
                              ...styles.podiumColumn,
                              ...(rang === 1 ? styles.podiumColumnFirst : {}),
                            }}
                          >
                            <div
                              style={{
                                ...styles.podiumPlayer,
                                ...(rang === 1 ? styles.podiumPlayerFirst : {}),
                              }}
                            >
                              <span style={styles.podiumRankBadge}>{rang}</span>
                              <span style={styles.podiumMedal}>{medaille}</span>
                              <TeamAvatar equipe={ligne.equipe} taille={rang === 1 ? 78 : 64} />
                              <strong style={styles.finalName}>{ligne.equipe.nom}</strong>
                              <span style={styles.podiumScore}>{ligne.pts} pts</span>
                            </div>

                            <div
                              style={{
                                ...styles.podiumBlock,
                                minHeight: hauteur,
                                ...(rang === 1
                                  ? styles.podiumBlockFirst
                                  : rang === 2
                                  ? styles.podiumBlockSecond
                                  : styles.podiumBlockThird),
                              }}
                            >
                              <strong style={styles.podiumPlace}>{rang}</strong>
                              <span style={styles.podiumPlaceLabel}>
                                {rang === 1 ? "Champion" : `${rang}e place`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button style={{ ...styles.primaryButton, marginTop: 16 }} onClick={() => setSouvenirOuvert(true)}>Créer l’affiche souvenir</button>
                  </section>
                )}

                <section style={styles.card}>
                  <div style={styles.formHeader}>
                    <div>
                      <span style={styles.eyebrow}>Classement général</span>
                      <h2 style={styles.sectionTitle}>Tableau</h2>
                    </div>
                    <span style={styles.pill}>{equipes.length} participants</span>
                  </div>
                  <div className="tourneo-ranking-table" style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th><th>Équipe</th><th>MJ</th><th>V</th><th>N</th><th>D</th><th>Diff.</th><th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classement.map((ligne, index) => (
                          <tr key={ligne.equipe.id}>
                            <td><strong>{index + 1}</strong></td>
                            <td><div style={styles.teamCell}><TeamAvatar equipe={ligne.equipe} taille={34} /><strong>{ligne.equipe.nom}</strong></div></td>
                            <td>{ligne.mj}</td><td>{ligne.v}</td><td>{ligne.n}</td><td>{ligne.d}</td>
                            <td>{ligne.diff > 0 ? `+${ligne.diff}` : ligne.diff}</td><td><strong>{ligne.pts}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {(formatTournoi === "poules" || formatTournoi === "poulesFinale") && (
              <>
                {formatTournoi === "poulesFinale" && renduResultatFinal()}
                <section style={styles.card}>
                  <span style={styles.eyebrow}>Classements</span>
                  <h2 style={styles.sectionTitle}>Poules</h2>
                  <div style={styles.poolGrid}>{poules.map(renduClassementPoule)}</div>
                </section>
              </>
            )}

            {formatTournoi === "elimination" && (
              <>
                {renduResultatFinal()}
                {renduClassementElimination()}
              </>
            )}
          </>
        )}

        {onglet === "statistiques" && (
          <>
            <section style={styles.statsGrid}>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>Participants</span>
                <strong style={styles.metricValue}>{equipes.length}</strong>
                <span style={styles.metricHint}>{LIBELLES_SPORT[sport] ?? sport}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>Matchs terminés</span>
                <strong style={styles.metricValue}>{joues}</strong>
                <span style={styles.metricHint}>sur {totalMatchsTheorique || matchs.length}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>Progression</span>
                <strong style={styles.metricValue}>{progression}%</strong>
                <span style={styles.metricHint}>{LIBELLES_FORMAT[formatTournoi]}</span>
              </article>
              <article style={styles.metricCard}>
                <span style={styles.metricLabel}>Phase actuelle</span>
                <strong style={{ ...styles.metricValue, fontSize: 22 }}>
                  {formatTournoi === "elimination" && journees.length > 0
                    ? titreJournee(journees[journees.length - 1])
                    : formatTournoi === "poulesFinale" && matchsFinale.length > 0
                    ? titreJournee(Math.max(...matchsFinale.map((match) => match.journee)))
                    : formatTournoi === "poulesFinale"
                    ? "Poules"
                    : LIBELLES_FORMAT[formatTournoi]}
                </strong>
                <span style={styles.metricHint}>mise à jour automatique</span>
              </article>
            </section>

            {(formatTournoi === "elimination" || formatTournoi === "poulesFinale") && renduResultatFinal()}

            <section style={styles.card}>
              <span style={styles.eyebrow}>Vue d’ensemble</span>
              <h2 style={styles.sectionTitle}>Activité du tournoi</h2>
              <div style={styles.activityList}>
                <div style={styles.activityRow}><span>Format</span><strong>{LIBELLES_FORMAT[formatTournoi]}</strong></div>
                <div style={styles.activityRow}><span>Sport</span><strong>{LIBELLES_SPORT[sport] ?? sport}</strong></div>
                <div style={styles.activityRow}><span>Résultats saisis</span><strong>{joues}</strong></div>
                <div style={styles.activityRow}><span>Résultats restant à saisir</span><strong>{Math.max(0, (totalMatchsTheorique || matchs.length) - joues)}</strong></div>
              </div>
            </section>
          </>
        )}

        {aideOuverte && (
          <div style={styles.modalBackdrop} onClick={() => setAideOuverte(false)}>
            <section style={styles.helpModal} onClick={(event) => event.stopPropagation()}>
              <LogoTourneo compact />
              <div style={{ marginTop: 18 }}>
                <span style={styles.eyebrow}>Aide · sécurité · règles</span>
                <h2 style={styles.sectionTitle}>Comment fonctionne Tourneo ?</h2>
              </div>
              <div style={styles.helpGrid}>
                <article style={styles.helpItem}><strong>1. Créer</strong><span>Choisissez le sport, le format et les participants.</span></article>
                <article style={styles.helpItem}><strong>2. Jouer</strong><span>L’organisateur saisit et valide les résultats.</span></article>
                <article style={styles.helpItem}><strong>3. Partager</strong><span>Le QR du tournoi ouvre une vue publique strictement en lecture seule.</span></article>
                <article style={styles.helpItem}><strong>4. Progresser</strong><span>Les joueurs identifiés gagnent des points et des badges dans leur profil.</span></article>
              </div>
              <div style={styles.legalBox}>
                <strong>Responsabilité & intégrité</strong>
                <p>Tourneo est un outil d’organisation et d’aide au calcul. L’organisateur reste responsable des règles appliquées, de la saisie et de la validation des résultats, des participants et de l’arbitrage des litiges. En cas d’écart entre l’application et une décision officielle de l’organisateur, la décision humaine prévaut.</p>
                <p>Un incident technique, une interruption réseau ou une erreur logicielle peut survenir. Conservez les résultats importants et utilisez l’export lorsque nécessaire.</p>
              </div>
              <div style={styles.legalBox}>
                <strong>Données & sécurité</strong>
                <p>Le lien public ne permet pas de modifier les scores. Les profils joueurs n’exposent que le pseudo, le code joueur, les badges et le palmarès. Évitez de saisir des informations sensibles dans les noms de tournois ou de participants.</p>
              </div>
              <button style={styles.primaryButton} onClick={() => (window.location.href = "/aide")}>Ouvrir le centre d’aide</button>
              <button style={styles.ghostWide} onClick={() => setAideOuverte(false)}>Fermer</button>
            </section>
          </div>
        )}

        {qrOuvert && (
          <div style={styles.modalBackdrop} onClick={() => setQrOuvert(false)}>
            <section style={styles.qrModal} onClick={(event) => event.stopPropagation()}>
              <LogoTourneo compact />
              <div style={{ marginTop: 20 }}>
                <span style={styles.eyebrow}>Partager</span>
                <h2 style={styles.sectionTitle}>QR code du tournoi</h2>
              </div>
              <div style={styles.qrBox}><QRCodeSVG value={lienPartage} size={220} /></div>
              <p style={styles.shareLink}>{lienPartage}</p>
              <button style={styles.primaryButton} onClick={copierLien}>Copier le lien</button>
              <button style={styles.ghostWide} onClick={() => setQrOuvert(false)}>Fermer</button>
            </section>
          </div>
        )}
      </div>

      {souvenirOuvert && (
        <div style={styles.modalBackdrop}>
          <section className="tourneo-souvenir-modal" style={{ ...styles.modalCard, maxWidth: 1180 }}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.eyebrow}>Souvenir du tournoi</span>
                <h2 style={styles.sectionTitle}>{nomTournoi}</h2>
              </div>
              <button style={styles.modalClose} onClick={() => setSouvenirOuvert(false)}>×</button>
            </div>

            {podiumPhotoUrl && (
              <div style={styles.souvenirTools}>
                <button style={styles.ghostButton} onClick={() => setPodiumPhotoUrl("")}>Retirer la photo</button>
              </div>
            )}

            <div id="tourneo-souvenir" className="tourneo-souvenir-poster" style={styles.souvenirPoster}>
              <div className="tourneo-souvenir-brand" style={styles.souvenirBrand}>
                <TourneoBrand />
              </div>

              <label
                className="tourneo-souvenir-photo-zone"
                style={podiumPhotoUrl ? styles.souvenirPhotoFrame : styles.souvenirPhotoPlaceholder}
                title={podiumPhotoUrl ? "Changer la photo des finalistes" : "Ajouter la photo des 3 finalistes"}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={choisirPhotoPodium}
                  style={{ display: "none" }}
                />

                {podiumPhotoUrl ? (
                  <>
                    <img src={podiumPhotoUrl} alt="Photo des finalistes" style={styles.souvenirPhoto} />
                    <span style={styles.photoCaption}>📷 Cliquer pour changer la photo</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 34 }}>📸</span>
                    <strong>Photo des 3 finalistes</strong>
                    <span>Ajoutez une photo avant d’imprimer ou partager l’affiche.</span>
                    <span style={styles.photoTapHint}>Cliquer ici pour prendre ou choisir une photo</span>
                  </>
                )}
              </label>

              <div className="tourneo-souvenir-right" style={styles.souvenirRight}>
                <div style={styles.souvenirTitleBox}>
                  <span style={styles.eyebrow}>Résultats officiels</span>
                  <h2 style={styles.souvenirTitle}>{nomTournoi}</h2>
                  <p style={styles.souvenirMeta}>{LIBELLES_SPORT[sport] ?? sport} · {LIBELLES_FORMAT[formatTournoi]}</p>
                </div>

                {podium.length >= 3 && (
                  <div className="tourneo-souvenir-podium" style={styles.souvenirPodium}>
                    {[podium[1], podium[0], podium[2]].map((ligne, index) => {
                      const rang = index === 0 ? 2 : index === 1 ? 1 : 3;
                      const hauteur = rang === 1 ? 140 : rang === 2 ? 112 : 96;
                      return (
                        <div key={ligne.equipe.id} style={styles.souvenirPodiumColumn}>
                          <TeamAvatar equipe={ligne.equipe} taille={rang === 1 ? 64 : 52} />
                          <strong style={styles.souvenirPlayerName}>{ligne.equipe.nom}</strong>
                          <span style={styles.souvenirPoints}>{ligne.pts} pts</span>
                          <div style={{ ...styles.souvenirPodiumBlock, minHeight: hauteur, ...(rang === 1 ? styles.souvenirFirst : rang === 2 ? styles.souvenirSecond : styles.souvenirThird) }}>
                            <span style={styles.souvenirMedal}>{rang === 1 ? "🥇" : rang === 2 ? "🥈" : "🥉"}</span>
                            <strong>{rang}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="tourneo-souvenir-footer" style={styles.souvenirFooter}>
                  <div style={styles.qrSouvenirBox}>
                    {lienPartage && <QRCodeSVG value={lienPartage} size={92} />}
                  </div>
                  <div style={styles.qrSouvenirText}>
                    <strong>Voir le classement complet</strong>
                    <span>Scannez ce QR code pour retrouver tous les participants, les matchs et le classement du tournoi.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tourneo-souvenir-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button style={styles.primaryButton} onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
              <button style={styles.secondaryButton} onClick={partagerTournoi}>Partager les résultats</button>
            </div>
          </section>
        </div>
      )}

      {scannerOuvert && (
        <div style={styles.modalBackdrop} onClick={fermerScanner}>
          <section style={styles.scannerModal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.eyebrow}>Profil Tourneo</span>
                <h2 style={styles.sectionTitle}>Scanner le QR joueur</h2>
              </div>
              <button style={styles.modalClose} onClick={fermerScanner}>×</button>
            </div>

            <div style={styles.scannerViewport}>
              <video ref={videoScannerRef} playsInline muted style={styles.scannerVideo} />
              <div style={styles.scannerFrame} />
            </div>

            <p style={styles.scannerHelp}>
              Placez le QR personnel du joueur au centre. Son profil sera ajouté automatiquement.
            </p>
            {scannerMessage && <div style={styles.inlineWarning}>{scannerMessage}</div>}
            <button style={styles.ghostWide} onClick={fermerScanner}>Annuler</button>
          </section>
        </div>
      )}

      <TeamModal
        ouvert={modalOuvert}
        equipeAModifier={equipeAModifier}
        onFermer={() => {
          setModalOuvert(false);
          setEquipeAModifier(null);
        }}
        onAjouter={enregistrerEquipe}
      />
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "0 16px 64px",
    background:
      "radial-gradient(circle at 8% 5%, rgba(124,92,255,.30), transparent 25%), radial-gradient(circle at 88% 8%, rgba(34,211,238,.20), transparent 26%), radial-gradient(circle at 55% 88%, rgba(236,72,153,.10), transparent 30%), linear-gradient(145deg,#080A12 0%,#0B1020 45%,#090D18 100%)",
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
  sponsorCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "16px 18px", marginBottom: 16, borderRadius: 20, background: "linear-gradient(135deg,rgba(124,92,255,.10),rgba(34,211,238,.05))", border: "1px solid rgba(148,163,184,.11)" },
  sponsorTitle: { display: "block", margin: "4px 0", fontSize: 20 },
  sponsorBadge: { padding: "7px 10px", borderRadius: 999, color: "#9eeeff", background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.16)", fontSize: 11, fontWeight: 900 },
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
