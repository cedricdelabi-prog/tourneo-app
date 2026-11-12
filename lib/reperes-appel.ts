import type { Equipe, Match } from '@/types';
import { joueursDuMatch } from '@/lib/planning';
export type RepereAppel = { id: string; nom: string; statut: 'profil' | 'sur_place' | 'inconnu' };
// A UUID is not proof of an account: manually created players also use UUIDs.
// The verified set comes from the existing authenticated profile lookup.
export function reperesAppel(match: Match, equipes: Equipe[], profils: ReadonlySet<string> | null): RepereAppel[] {
  return joueursDuMatch(match).map(id => {
    const equipe = equipes.find(e => e.id === id);
    return { id, nom: equipe?.nom || 'Participant', statut: !equipe || profils === null ? 'inconnu' : profils.has(equipe.profilId || equipe.id) ? 'profil' : 'sur_place' };
  });
}
