import type { Equipe, Match } from "@/types";
import { calculerClassement } from "@/lib/tournoi";

/** Tournament engines shared by mobile and web. All functions are pure. */
export function scoreValide(score: string | number | null | undefined): boolean {
  if (score === null || score === undefined) return false;
  const valeur = String(score);
  return /^(0|[1-9]\\d*)$/.test(valeur) && Number.isSafeInteger(Number(valeur));
}

export function matchTermine(match: Match): boolean {
  return scoreValide(match.score1) && scoreValide(match.score2);
}

/** Return leg-by-leg series result. Ties do not count as wins. */
export function resultatSerie(
  rencontres: ReadonlyArray<Pick<Match, "score1" | "score2">>,
  manchesGagnantes: number
): { victoires1: number; victoires2: number; vainqueur: 1 | 2 | null } {
  if (!Number.isSafeInteger(manchesGagnantes) || manchesGagnantes < 1)
    throw new Error("Nombre de manches gagnantes invalide");
  let victoires1 = 0;
  let victoires2 = 0;
  for (const rencontre of rencontres) {
    if (!scoreValide(rencontre.score1) || !scoreValide(rencontre.score2)) continue;
    if (victoires1 >= manchesGagnantes || victoires2 >= manchesGagnantes) break;
    if (Number(rencontre.score1) > Number(rencontre.score2)) victoires1++;
    if (Number(rencontre.score2) > Number(rencontre.score1)) victoires2++;
  }
  return {
    victoires1,
    victoires2,
    vainqueur: victoires1 >= manchesGagnantes ? 1 : victoires2 >= manchesGagnantes ? 2 : null,
  };
}

/**
 * Create the next Swiss round from completed previous rounds.
 * Prioritizes equal scores and avoids repeat pairings when possible.
 * Returns a bye separately; it must be recorded by the organizer.
 */
export function prochaineRondeSuisse(
  equipes: Equipe[],
  matchsPrecedents: Match[],
  numeroRonde: number
): { matchs: Match[]; exemptId: string | null } {
  if (!Number.isSafeInteger(numeroRonde) || numeroRonde < 1)
    throw new Error("Numéro de ronde invalide");
  if (equipes.length < 2) return { matchs: [], exemptId: equipes[0]?.id ?? null };
  if (new Set(equipes.map((e) => e.id)).size !== equipes.length)
    throw new Error("Identifiants de participants dupliqués");
  if (matchsPrecedents.some((m) => !matchTermine(m)))
    throw new Error("Terminez tous les matchs précédents avant la prochaine ronde");

  const dejaJoues = new Set<string>();
  const exemptions = new Map<string, number>(equipes.map((e) => [e.id, 0]));
  const classement = calculerClassement(equipes, matchsPrecedents);
  for (const m of matchsPrecedents) {
    if (m.equipe1Id && m.equipe2Id) {
      dejaJoues.add([m.equipe1Id, m.equipe2Id].sort().join("|"));
    }
  }
  const restants = classement.map((c) => c.equipe);
  let exemptId: string | null = null;
  if (restants.length % 2) {
    // Favor a lower-ranked participant who has not already received a bye.
    const index = restants.length - 1;
    const candidats = restants.filter((e) => (exemptions.get(e.id) ?? 0) === 0);
    const exempt = candidats[candidats.length - 1] ?? restants[index];
    exemptId = exempt.id;
    restants.splice(restants.findIndex((e) => e.id === exempt.id), 1);
  }
  const matchs: Match[] = [];
  while (restants.length > 1) {
    const equipe1 = restants.shift()!;
    let adversaireIndex = restants.findIndex(
      (e) => !dejaJoues.has([equipe1.id, e.id].sort().join("|"))
    );
    if (adversaireIndex < 0) adversaireIndex = 0;
    const [equipe2] = restants.splice(adversaireIndex, 1);
    matchs.push({
      id: 300000 + numeroRonde * 10000 + matchs.length + 1,
      journee: numeroRonde,
      equipe1Id: equipe1.id,
      equipe2Id: equipe2.id,
      score1: "",
      score2: "",
    });
  }
  return { matchs, exemptId };
}

/** Read-only standings export, escaped for spreadsheet interoperability. */
export function classementCSV(equipes: Equipe[], matchs: Match[]): string {
  const entete = ["Rang", "Participant", "MJ", "V", "N", "D", "Pour", "Contre", "Diff", "Points"];
  const lignes = calculerClassement(equipes, matchs).map((c, i) => [
    i + 1, c.equipe.nom, c.mj, c.v, c.n, c.d, c.pour, c.contre, c.diff, c.pts,
  ]);
  const cellule = (valeur: string | number) => {
    const texte = String(valeur);
    // Prevent formula injection when exported CSV is opened in Excel.
    const protege = /^[\\s]*[=+@-]/.test(texte) ? "'" + texte : texte;
    return '"' + protege.replace(/"/g, '""') + '"';
  };
  return "\\uFEFF" + [entete, ...lignes].map((l) => l.map(cellule).join(";")).join("\\r\\n");
}
