"use client";
import {usePathname}from'next/navigation';
import AideInfo from'@/components/AideInfo';
const aides:[RegExp,string,string][]=[
 [/\/affiche$/,'Créer une affiche','Le titre, le sport, la date et le lieu viennent du tournoi. Choisissez les inscriptions en ligne ou sur place, puis téléchargez ou partagez votre affiche. Les informations peuvent être personnalisées sans changer le tournoi.'],
 [/\/inscriptions\//,'Inscriptions','Le QR code ouvre la page de ce tournoi. Une demande peut nécessiter la validation de l’organisateur. Gardez votre confirmation pour retrouver votre inscription.'],
 [/\/inscriptions$/,'Inscriptions et pointage','Ouvrez les inscriptions en ligne, fixez la capacité et choisissez si vous validez chaque demande. Le pointage indique les personnes présentes. Après démarrage, les inscriptions sont closes.'],
 [/\/imprimer$/,'Impression','Choisissez les rubriques à imprimer et le format papier. Les scores vierges permettent de suivre les matchs à la main. L’impression ne modifie aucun résultat.'],
 [/\/arbitrage/,'Arbitrage','Ouvrez un match attribué pour retrouver le chrono, le compteur et les règles. Envoyez ensuite le résultat proposé : il devient officiel après validation de l’organisateur.'],
 [/\/outils/,'Boîte à outils','Le chrono et le compteur aident pendant le match. La roulette répartit aléatoirement les participants en équipes. Aucun résultat officiel n’est validé depuis ces outils.'],
 [/\/tournoi\//,'Votre tournoi','Choisissez un sport et une formule, ajoutez les participants, puis démarrez. Les petits i expliquent les réglages. Les résultats saisis doivent être validés pour compter officiellement.'],
 [/\/statistiques/,'Statistiques','Les filtres portent sur la date de création des tournois. Les matchs validés et la progression permettent de distinguer les résultats officiels des scores encore en préparation.'],
 [/\/administration/,'Administration','Les statistiques et comptes sont réservés aux administrateurs. Seuls les super administrateurs peuvent attribuer les droits et offrir un accès Expert pour la future offre. Toute modification est conservée dans l’historique.'],
 [/\/olympiades/,'Olympiades','Conservez les mêmes équipes sur plusieurs activités. Le classement transforme les places en points : les unités des sports ne sont pas additionnées. Les épreuves validées comptent au total.'],
 [/\/evenements/,'Événements','Regroupez plusieurs tournois dans un programme commun. Pour garder les mêmes équipes et calculer un classement entre activités, utilisez les Olympiades.'],
 [/\/groupes/,'Groupes','Retrouvez vos groupes de participants et réutilisez-les dans les tournois. Les accès partagés dépendent du rôle attribué par le propriétaire.'],
 [/\/mes-matchs/,'Mes matchs','Retrouvez vos rencontres en tant que joueur et les résultats validés. Si vous êtes aussi arbitre, changez d’espace pour transmettre un score.'],
 [/\/profil/,'Mon profil','Votre code joueur sert à vous ajouter à un tournoi et à vous désigner arbitre. Les alertes sont facultatives. Un compte peut être à la fois organisateur, arbitre et joueur.'],
 [/\/activite/,'Activité','Retrouvez les informations liées à vos tournois. Une alerte reçue dans Tourneo n’indique pas qu’un appel téléphonique a été passé.'],
 [/\/dashboard/,'Mes tournois','Ouvrez un tournoi pour le préparer ou le poursuivre. Le menu Mon espace donne accès à vos rôles de joueur, arbitre et organisateur.'],
];
export default function AideEcran(){const path=usePathname();const aide=aides.find(([r])=>r.test(path));return aide?<AideInfo titre={aide[1]}>{aide[2]}</AideInfo>:null;}
