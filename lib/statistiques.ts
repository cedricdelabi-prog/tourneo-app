import type { Equipe, Match } from "@/types";
import { tournoiEstTermine } from "@/lib/resultats";
import { matchTermine } from "@/lib/formats-avances";
import { normaliserOptionsV2, type OptionsV2 } from "@/lib/options-v2";
export type TournoiStat = { id: string; nom: string; sport: string; created_at: string; donnees: { equipes?: Equipe[]; matchs?: Match[]; matchsValides?: number[]; cree?: boolean; formatTournoi?: string; optionsV2?: Partial<OptionsV2> } | null };
export function statistiquesTournois(tournois: TournoiStat[]) {
  const profils = new Set<string>();
  const sports = new Map<string, { sport: string; tournois: number; participations: number; matchs: number; valides: number }>();
  let participations = 0, matchs = 0, valides = 0, termines = 0, brouillons = 0;
  for (const t of tournois) {
    const d = t.donnees || {};
    const es = Array.isArray(d.equipes) ? d.equipes : [], ms = Array.isArray(d.matchs) ? d.matchs : [];
    const joues = ms.filter(m => matchTermine(m) && (!Array.isArray(d.matchsValides) || d.matchsValides.includes(m.id))).length;
    participations += es.length; matchs += ms.length; valides += joues;
    for (const e of es) if (e.profilId) profils.add(e.profilId);
    if (!d.cree && !ms.length) brouillons++;
    if (tournoiEstTermine(d.formatTournoi || "complet", es, ms, normaliserOptionsV2(d.optionsV2), d.matchsValides)) termines++;
    const ligne = sports.get(t.sport) || { sport: t.sport, tournois: 0, participations: 0, matchs: 0, valides: 0 };
    ligne.tournois++; ligne.participations += es.length; ligne.matchs += ms.length; ligne.valides += joues; sports.set(t.sport, ligne);
  }
  return { tournois: tournois.length, termines, brouillons, participations, joueursIdentifies: profils.size, matchs, valides, tauxValidation: matchs ? Math.round(valides * 100 / matchs) : 0, sports: [...sports.values()].sort((a,b) => b.tournois - a.tournois || a.sport.localeCompare(b.sport)) };
}
