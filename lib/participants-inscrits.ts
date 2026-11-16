import type { Equipe } from '@/types';
export type InscriptionAcceptee = { id: string; nom: string; joueurs?: string[]; user_id?: string | null; type_participant?: string };

export function fusionnerInscriptions(equipes: Equipe[], inscriptions: InscriptionAcceptee[]): Equipe[] {
  const comptes = new Set(inscriptions.filter(i => i.type_participant === 'individuel' && i.user_id).map(i => i.user_id));
  const manuels = equipes.filter(e => !e.id.startsWith('inscription:') && !comptes.has(e.profilId ?? e.id));
  const noms = new Set(manuels.map(e => e.nom.trim().toLocaleLowerCase('fr')));
  if (inscriptions.some(i => noms.has(i.nom.trim().toLocaleLowerCase('fr')))) {
    throw new Error('Un participant manuel porte le nom d’une inscription acceptée. Renommez-le avant de démarrer.');
  }
  return [...manuels, ...inscriptions.map(i => {
    const ancien = equipes.find(e => e.id === `inscription:${i.id}`);
    return { ...ancien, id: `inscription:${i.id}`, nom: i.nom, joueurs: i.joueurs,
      profilId: i.type_participant === 'individuel' ? i.user_id ?? undefined : undefined,
      emoji: ancien?.emoji || '🏅', couleur: ancien?.couleur || '#3B82F6' };
  })];
}
