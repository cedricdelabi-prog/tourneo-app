import type { Match } from '@/types';
import { joueursDuMatch, planifierMatchs, type Creneau } from '@/lib/planning';
import { scoreValide } from '@/lib/formats-avances';

export type PassageJoueur = { match: Match; creneau: Creneau; avant: number; statut: 'validation' | 'attente' | 'prochain' };
export function passagesParticipants(matchs: Match[], options: Parameters<typeof planifierMatchs>[1], valides?: readonly number[]): Map<string, PassageJoueur[]> {
  const planning = planifierMatchs(matchs, options);
  const parId = new Map(matchs.map(m => [m.id,m]));
  const resultats = new Map<string,PassageJoueur[]>();
  const marques = valides ? new Set(valides) : null;
  const attenteTerrain = new Map<number,number>();
  const attenteJoueur = new Map<string,Map<number,number>>();
  for (const creneau of planning) {
    const match = parId.get(creneau.matchId)!;
    const scores = scoreValide(match.score1) && scoreValide(match.score2);
    if (marques ? marques.has(match.id) : scores) continue;
    const joueurs = joueursDuMatch(match);
    const autres = new Set<number>();
    for (const joueur of joueurs) for (const [id,terrain] of attenteJoueur.get(joueur) || []) if (terrain !== creneau.terrain) autres.add(id);
    const avant = (attenteTerrain.get(creneau.terrain) || 0) + autres.size;
    const passage: PassageJoueur = { match,creneau,avant,statut:scores ? 'validation' : avant ? 'attente' : 'prochain' };
    for (const joueur of joueurs) {
      if (!resultats.has(joueur)) resultats.set(joueur,[]);
      resultats.get(joueur)!.push(passage);
      if (!attenteJoueur.has(joueur)) attenteJoueur.set(joueur,new Map());
      attenteJoueur.get(joueur)!.set(match.id,creneau.terrain);
    }
    attenteTerrain.set(creneau.terrain,(attenteTerrain.get(creneau.terrain) || 0)+1);
  }
  return resultats;
}
export function passagesJoueur(participant: string, matchs: Match[], options: Parameters<typeof planifierMatchs>[1], valides?: readonly number[]): PassageJoueur[] {
  return participant ? passagesParticipants(matchs,options,valides).get(participant) || [] : [];
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
