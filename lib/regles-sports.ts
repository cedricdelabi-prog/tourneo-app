export type FicheRegles={titre:string;reperes:string[];sources:{nom:string;url:string}[]};
// Concise paraphrases, checked 13 November 2026; variants remain the organizer's choice.
export const REGLES_SPORTS:Record<string,FicheRegles>={
 tennis:{titre:'Tennis · format standard',reperes:['Points : 0, 15, 30, 40. À 40–40, il faut deux points consécutifs pour gagner le jeu (avantage puis jeu).','Un set se gagne à 6 jeux avec 2 jeux d’écart. À 6–6, le jeu décisif se compte en points ordinaires, jusqu’à 7 avec 2 points d’écart.','Tourneo propose ce compteur avec jeu décisif dans chaque set. Les formats courts, le point décisif sans avantage ou le super jeu décisif demandent un barème adapté.'],sources:[{nom:'ITF · règles 2026',url:'https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf'}]},
 flechettes:{titre:'Fléchettes · cible traditionnelle, pointe acier',reperes:['Installation : centre de la cible à 1,73 m du sol ; ligne de lancer à 2,37 m horizontalement depuis la face de la cible.','Repère DRA : fléchettes de 40 g maximum et 200 mm maximum. Les limites diffèrent selon le circuit et le matériel ; elles ne sont pas universelles.','En 501 classique : jusqu’à trois fléchettes par tour, on retranche les points. Il faut arriver exactement à zéro en terminant par un double ; un dépassement annule la volée.','Pour une animation, annoncez avant le début : 301 ou 501, sortie simple ou double, nombre de manches et règle de dépassement.'],sources:[{nom:'DRA · règlement en vigueur',url:'https://www.thedra.co.uk/dra-rulebook'},{nom:'PDPA · matériel',url:'https://pdpa.co.uk/event-entry/dart-points-information/'}]},
 'flechettes-electroniques':{titre:'Fléchettes électroniques',reperes:['Utilisez les pointes et le poids autorisés par le fabricant de la cible. La limite d’un circuit à pointe acier ne s’applique pas automatiquement.','La distance, le comptage et la sortie dépendent du modèle et du jeu choisis. Faites une partie d’essai et affichez ces choix avant le tournoi.'],sources:[]},
 'ping-pong':{titre:'Tennis de table · règles du jeu',reperes:[
 'Score : une manche va à 11 points, avec deux points d’avance. À 10–10, continuez jusqu’à cet écart.',
 'Service : changez de serveur tous les deux points ; à 10–10, alternez à chaque point.',
 'Geste du service : balle sur la paume ouverte, lancer vertical d’au moins 16 cm, puis frappe pendant la descente. Gardez la balle visible, derrière la ligne de fond et au-dessus du plateau.',
 'Rebonds au service : d’abord votre camp, puis le camp adverse. En double, servez du demi-camp droit vers le demi-camp droit adverse.',
 'Filet au service : si le service est autrement correct, rejouez le point. Pendant un échange, toucher le filet reste permis si la balle retombe correctement chez l’adversaire.',
 'Fautes : renvoi irrégulier, main libre sur le plateau, déplacement de la table ou contact avec le filet font perdre le point.',
 'Double : les partenaires frappent alternativement ; ne frappez pas deux fois de suite pour votre équipe.',
 'Changement de côté : après chaque manche ; dans la manche décisive, dès qu’un camp atteint 5 points.',
 'Format Tourneo : 3 manches gagnantes par défaut.',
 ],sources:[{nom:'FFTT · règles du jeu, mise à jour du 13 mars 2026',url:'https://www.fftt.com/wp-content/uploads/2026/03/calameo_reglements_sportifs_2025_13-mars-2026.pdf'}]},
 volley:{titre:'Volley-ball · format FIVB',reperes:['Match en 3 sets gagnants. Les quatre premiers sets se jouent à 25 points, avec 2 points d’écart.','Le cinquième set décisif se joue à 15 points, toujours avec 2 points d’écart. Une animation peut annoncer un format plus court.'],sources:[{nom:'FIVB · règles 2025–2028',url:'https://www.fivb.com/volleyball/the-game/official-volleyball-rules/'}]},
 badminton:{titre:'Badminton · choisir le format annoncé',reperes:['En France, la FFBaD applique 2 sets gagnants de 15 points depuis le 1er septembre 2026. Le format 21 points reste utilisé dans certains cadres.','Sélectionnez Badminton (15 points) pour le préréglage 15 points ; Badminton conserve le préréglage historique 21 points. Vérifiez le règlement de votre événement.'],sources:[{nom:'FFBaD · évolution du score en 2026',url:'https://www.ffbad.org/en/actualites/actualites/2026/communication-sur-le-systeme-de-score'}]},
 petanque:{titre:'Pétanque · règles du jeu',reperes:[
 'Format : en individuel ou doublette, chacun dispose de 3 boules ; en triplette, de 2 boules.',
 'Score : la partie usuelle va à 13 points. Certains tours peuvent être annoncés en 11 points ou en temps limité.',
 'Distance du but : de 6 à 10 mètres depuis l’intérieur du cercle pour juniors et seniors. Des distances plus courtes existent pour les jeunes.',
 'Lancer : gardez les pieds entièrement dans le cercle jusqu’à ce que la boule touche le sol.',
 'Boules adultes : métal homologué, 650 à 800 g, diamètre 70,5 à 80 mm. Des exceptions existent pour les jeunes de 11 ans et moins.',
 'But : diamètre 30 mm avec tolérance de 1 mm ; poids entre 10 et 18 g, bois ou matière homologuée.',
 'Mène : chaque boule plus proche du but que la meilleure adverse rapporte un point. L’équipe sans le point rejoue.',
 'Mesure : utilisez un instrument adapté, pas les pieds. En cas de désaccord, faites mesurer par l’arbitre avant de ramasser les boules.',
 'Temps : une minute pour jouer.',
 ],sources:[{nom:'FIPJP · règlement officiel, édition décembre 2020',url:'https://fipjp.org/images/pdf/reglements/REGLEMENT-OFFICIEL-SPORT-PETANQUE.pdf'}]},
};
REGLES_SPORTS.badminton15=REGLES_SPORTS.badminton;
