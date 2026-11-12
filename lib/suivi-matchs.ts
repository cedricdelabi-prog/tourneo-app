import type { Match } from '@/types';
import { joueursDuMatch, planifierMatchs, type Creneau } from '@/lib/planning';
import { scoreValide } from '@/lib/formats-avances';

export type PassageJoueur = { match: Match; creneau: Creneau; avant: number; statut: 'validation' | 'attente' | 'prochain' };
export function passagesJoueur(participant: string, matchs: Match[], options: Parameters<typeof planifierMatchs>[1], valides?: readonly number[]): PassageJoueur[] {
  if (!participant) return [];
  const planning = planifierMatchs(matchs, options);
  const parId = new Map(matchs.map(m => [m.id, m]));
  const valide = (m: Match) => valides ? valides.includes(m.id) : scoreValide(m.score1) && scoreValide(m.score2);
  return planning.flatMap((creneau, index) => {
    const match = parId.get(creneau.matchId)!;
    const joueurs = joueursDuMatch(match);
    if (!joueurs.includes(participant) || valide(match)) return [];
    const avant = planning.slice(0, index).filter(p => {
      const precedent = parId.get(p.matchId)!;
      return !valide(precedent) && (p.terrain === creneau.terrain || joueursDuMatch(precedent).some(j => joueurs.includes(j)));
    }).length;
    return [{ match, creneau, avant, statut: scoreValide(match.score1) && scoreValide(match.score2) ? 'validation' as const : avant ? 'attente' as const : 'prochain' as const }];
  });
}

// No account IDs or subscription are sent to the server: this is device-local follow-up.
export async function notifierPassage(tournoi: string, match: number, body: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = { body, tag: `tourneo-${tournoi}-${match}`, icon: '/tourneo-icon.png', data: { url: `/partage/${encodeURIComponent(tournoi)}#match-${match}` } };
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration?.active) await registration.showNotification('Tourneo · Prochain match', options);
    else {
      const notification = new Notification('Tourneo · Prochain match', options);
      notification.onclick = () => { window.focus(); window.location.assign(options.data.url); notification.close(); };
    }
    return true;
  } catch { return false; }
}
