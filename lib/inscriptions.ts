export type StatutInscription = 'en_attente' | 'a_valider' | 'accepte' | 'refuse' | 'annule';
export type Inscription = { id: string; nom: string; statut: StatutInscription; present: boolean; joueurs?: string[]; type_participant?: string; created_at?: string };
export const STATUTS_INSCRIPTION: Record<StatutInscription, string> = { en_attente: 'Liste d’attente', a_valider: 'À valider', accepte: 'Inscription confirmée', refuse: 'Non retenue', annule: 'Annulée' };
export function erreurInscriptions(message: string) {
  return /schema cache|does not exist|could not find|PGRST202|PGRST205/i.test(message)
    ? 'Le module d’inscriptions doit encore être activé sur la base V2. Les autres fonctions restent disponibles.'
    : message;
}
