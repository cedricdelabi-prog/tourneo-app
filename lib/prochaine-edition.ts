import type { Equipe } from '@/types';
import { normaliserOptionsV2, type OptionsV2 } from '@/lib/options-v2';

export type ModeleEdition = {
  sport: string;
  formatTournoi: string;
  modePoules: string;
  nombrePoules: number;
  taillePoules: number;
  qualifiesParPoule: number;
  optionsV2: OptionsV2;
  equipes: Equipe[];
};

/** Build a new private draft using a whitelist: no scores, permissions or tokens. */
export function preparerEdition(source: ModeleEdition, garderParticipants: boolean, nouvelId: () => string) {
  const optionsV2 = normaliserOptionsV2(source.optionsV2);
  optionsV2.depart = '';
  optionsV2.rappelAvant = 0;
  optionsV2.exemptions = [];
  delete optionsV2.adaptationPlanning;
  const equipes: Equipe[] = garderParticipants ? source.equipes.map(e => ({
    id: nouvelId(), nom: e.nom, emoji: e.emoji, couleur: e.couleur,
    profilId: e.profilId, niveau: e.niveau,
    joueurs: e.joueurs ? [...e.joueurs] : undefined, capitaine: e.capitaine,
  })) : [];
  return {
    sport: source.sport, formatTournoi: source.formatTournoi,
    modePoules: source.modePoules, nombrePoules: source.nombrePoules,
    taillePoules: source.taillePoules, qualifiesParPoule: source.qualifiesParPoule,
    optionsV2, equipes, cree: false, matchs: [], matchsValides: [],
    poules: [], matchsPhaseFinale: [], podiumPhotoUrl: '', termine: false, podiumFinal: [],
  };
}
