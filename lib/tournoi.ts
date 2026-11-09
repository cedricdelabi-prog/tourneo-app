import type { Classement, Equipe, Match } from "@/types";

export function genererMatchs(equipesInitiales: Equipe[]): Match[] {
  if (equipesInitiales.length < 2) return [];
  const equipes = [...equipesInitiales];
  const exempt: Equipe = {
    id: "exempt",
    nom: "EXEMPT",
    emoji: "⏸️",
    couleur: "#334155",
  };

  if (equipes.length % 2 !== 0) equipes.push(exempt);

  const matchs: Match[] = [];
  let id = 1;

  for (let journee = 1; journee < equipes.length; journee++) {
    for (let i = 0; i < equipes.length / 2; i++) {
      const equipe1 = equipes[i];
      const equipe2 = equipes[equipes.length - 1 - i];

      if (equipe1.id !== "exempt" && equipe2.id !== "exempt") {
        matchs.push({
          id: id++,
          journee,
          equipe1Id: equipe1.id,
          equipe2Id: equipe2.id,
          score1: "",
          score2: "",
        });
      }
    }

    const fixe = equipes[0];
    const rotation = equipes.slice(1);
    rotation.unshift(rotation.pop() as Equipe);
    equipes.splice(0, equipes.length, fixe, ...rotation);
  }

  return matchs;
}
export function genererMatchsElimination(equipes: Equipe[]): Match[] {
  const matchs: Match[] = [];

  for (let i = 0; i < equipes.length; i += 2) {
    const equipe1 = equipes[i];
    const equipe2 = equipes[i + 1];

    if (!equipe1 || !equipe2) continue;

    matchs.push({
      id: 100000 + matchs.length + 1,
      journee: 1,
      equipe1Id: equipe1.id,
      equipe2Id: equipe2.id,
      score1: "",
      score2: "",
    });
  }

  return matchs;
}
export function calculerClassement(
  equipes: Equipe[],
  matchs: Match[]
): Classement[] {
  const tableau: Record<string, Classement> = {};

  equipes.forEach((equipe) => {
    tableau[equipe.id] = {
      equipe,
      mj: 0,
      v: 0,
      n: 0,
      d: 0,
      pour: 0,
      contre: 0,
      diff: 0,
      pts: 0,
    };
  });

  matchs.forEach((match) => {
    // Ignore incomplete, malformed or orphaned matches instead of corrupting standings.
    if (match.score1 === "" || match.score2 === "") return;
    if (!/^(0|[1-9]\d*)$/.test(match.score1) || !/^(0|[1-9]\d*)$/.test(match.score2)) return;

    const a = tableau[match.equipe1Id];
    const b = tableau[match.equipe2Id];
    if (!a || !b || a === b) return;
    const s1 = Number(match.score1);
    const s2 = Number(match.score2);
    if (!Number.isSafeInteger(s1) || !Number.isSafeInteger(s2)) return;

    a.mj++;
    b.mj++;
    a.pour += s1;
    a.contre += s2;
    b.pour += s2;
    b.contre += s1;

    if (s1 > s2) {
      a.v++;
      a.pts += 3;
      b.d++;
    } else if (s2 > s1) {
      b.v++;
      b.pts += 3;
      a.d++;
    } else {
      a.n++;
      b.n++;
      a.pts++;
      b.pts++;
    }
  });

  return Object.values(tableau)
    .map((ligne) => ({
      ...ligne,
      diff: ligne.pour - ligne.contre,
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.diff - a.diff ||
        b.pour - a.pour ||
        a.equipe.nom.localeCompare(b.equipe.nom)
    );
}

/** Return fixtures for home/away leagues without changing existing single-leg behavior. */
export function genererMatchsAllerRetour(equipes: Equipe[]): Match[] {
  const aller = genererMatchs(equipes);
  if (aller.length === 0) return [];
  const dernierTour = Math.max(...aller.map((match) => match.journee));
  const retour = aller.map((match, index): Match => ({
    id: aller.length + index + 1,
    journee: match.journee + dernierTour,
    equipe1Id: match.equipe2Id,
    equipe2Id: match.equipe1Id,
    score1: "",
    score2: "",
  }));
  return [...aller, ...retour];
}
