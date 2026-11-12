import type {Equipe} from '@/types';
export function modifierEquipeEnCours(ancienne:Equipe,modification:Equipe,maintenant=new Date().toISOString()):Equipe{
 const nom=modification.nom.trim();
 if(!nom||nom.length>100)throw new Error('Nom de participant invalide.');
 const joueurs=(modification.joueurs||[]).map(j=>j.trim()).filter(Boolean);
 if(joueurs.length>12||joueurs.some(j=>j.length>100))throw new Error('Liste des membres invalide.');
 const historique=ancienne.historique||[];
 const change=nom!==ancienne.nom||JSON.stringify(joueurs)!==JSON.stringify(ancienne.joueurs||[]);
 return {...ancienne,nom,joueurs,emoji:modification.emoji,couleur:modification.couleur,photo:modification.photo,
  historique:change?[...historique.slice(-19),{date:maintenant,nom:ancienne.nom,joueurs:[...(ancienne.joueurs||[])]}]:historique};
}
