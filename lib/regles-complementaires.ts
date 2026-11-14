import type {FicheRegles} from '@/lib/regles-sports';
type Texte=[string,string,string];
export const REGLES_COMPLEMENTAIRES:Record<string,FicheRegles>={};
export const traductionsRegles:Record<string,{en:string;nl:string}>={};
function f(code:string,titre:Texte,lignes:Texte[],sources:FicheRegles['sources'],nature:FicheRegles['nature']='fiche'){
 for(const [fr,en,nl]of[titre,...lignes])traductionsRegles[fr]={en,nl};
 REGLES_COMPLEMENTAIRES[code]={titre:titre[0],reperes:lignes.map(l=>l[0]),sources,nature,verifieLe:'2026-11-14'};
}
f('football',['Football · jeu à onze','Football · eleven-a-side','Voetbal · elf tegen elf'],[
 ['Deux équipes de onze au maximum, gardien compris.','Up to eleven per team, including the goalkeeper.','Maximaal elf per team, inclusief de doelman.'],
 ['Repère adulte : deux périodes de 45 minutes ; durée réduite à annoncer selon la compétition.','Adult reference: two 45-minute halves; announce any competition-specific shorter duration.','Volwassenen: twee helften van 45 minuten; kondig een kortere wedstrijdduur vooraf aan.'],
 ['Un but vaut un point. Annoncez le départage en cas de match nul.','Each goal counts once. Announce how drawn matches will be decided.','Een doelpunt telt eenmaal. Kondig aan hoe een gelijkspel wordt beslist.'],
 ['Le hors-jeu et les fautes suivent le règlement retenu ; ne les confondez pas avec le foot à cinq.','Offside and fouls follow the chosen rules; five-a-side differs.','Buitenspel en overtredingen volgen het gekozen reglement; zaalvoetbal verschilt.'],
],[{nom:'IFAB · Lois du Jeu 2026/27',url:'https://theifab.com/laws-of-the-game-documents/'}]);
f('futsal',['Futsal · règles FIFA','Futsal · FIFA rules','Futsal · FIFA-regels'],[
 ['Cinq joueurs par équipe sur le terrain, gardien compris.','Five players per side on court, including the goalkeeper.','Vijf spelers per team op het veld, inclusief de doelman.'],
 ['Format standard : deux périodes de 20 minutes de temps effectif.','Standard format: two periods of 20 minutes of actual playing time.','Standaard: twee periodes van 20 minuten zuivere speeltijd.'],
 ['Pas de hors-jeu. Les touches se remettent au pied.','No offside. Touchline restarts are kick-ins.','Geen buitenspel. Een zijlijnhervatting gebeurt met de voet.'],
 ['Les fautes cumulées et remises en jeu ont leurs règles propres ; fixez le format avant le tournoi.','Accumulated fouls and restarts have specific rules; set the format before play.','Opgetelde overtredingen en spelhervattingen hebben eigen regels; leg het formaat vooraf vast.'],
],[{nom:'FIFA · Futsal Laws 2025–2026, diffusion Canada Soccer',url:'https://canadasoccer.com/wp-content/uploads/2026/01/FIFA_Futsal_Laws-of_the_Game_2025-2026.pdf'}]);
f('foot5',['Football à cinq · choisir les règles de salle','Five-a-side · choose venue rules','Vijf-tegen-vijf · kies de zaalregels'],[
 ['Précisez cinq joueurs gardien compris, les remplaçants et la durée.','Specify five players including the goalkeeper, substitutes and duration.','Leg vijf spelers inclusief doelman, wisselspelers en speelduur vast.'],
 ['Annoncez si les parois font partie du jeu et comment effectuer les remises en jeu.','State whether walls are in play and how restarts work.','Geef aan of wanden meespelen en hoe het spel wordt hervat.'],
 ['Le règlement du centre peut différer du futsal et du football à onze.','Venue rules can differ from futsal and eleven-a-side.','Locatieregels kunnen verschillen van futsal en veldvoetbal.'],
 ['Publiez avant le départ : contacts autorisés, zone du gardien et départage.','Publish permitted contact, goalkeeper area and tie-break rules before starting.','Publiceer vooraf toegestane contacten, doelgebied en beslissingsregels.'],
],[],'variante');
f('basket',['Basket-ball · référence FIBA','Basketball · FIBA reference','Basketbal · FIBA-basis'],[
 ['Cinq joueurs de chaque équipe sur le terrain.','Five players per team on court.','Vijf spelers per team op het veld.'],
 ['Quatre quarts-temps de 10 minutes en format FIBA ; prolongation si nécessaire.','FIBA format: four 10-minute quarters; overtime if required.','FIBA: vier kwarten van 10 minuten; indien nodig verlenging.'],
 ['Un lancer franc vaut 1 point ; les paniers valent 2 ou 3 selon la position.','A free throw scores 1; field goals score 2 or 3 depending on position.','Een vrije worp telt 1; een velddoelpunt 2 of 3 afhankelijk van de positie.'],
 ['Marcher, reprise de dribble et contacts irréguliers sont sanctionnés.','Travelling, double dribble and illegal contact are penalized.','Lopen, dubbel dribbelen en ongeoorloofd contact worden bestraft.'],
],[{nom:'FIBA · règles officielles et éditions disponibles',url:'https://about.fiba.basketball/en/our-sport/official-basketball-rules'},{nom:'FFBB · règlement de jeu',url:'https://www.ffbb.com/reglement-de-jeu'}]);
f('basket3x3',['Basket 3 × 3 · un seul panier','3 × 3 basketball · one basket','3 × 3 basketbal · één basket'],[
 ['Trois joueurs par équipe sur le terrain, sur un demi-terrain.','Three players per team, on half a court.','Drie spelers per team, op een half veld.'],
 ['10 minutes, ou premier à 21 avant la limite ; prolongation gagnée en marquant 2 points.','10 minutes, or first to 21 before time expires; score 2 points to win overtime.','10 minuten, of als eerste 21 binnen de tijd; 2 punten in de verlenging winnen.'],
 ['Panier intérieur et lancer franc : 1 point ; extérieur à l’arc : 2 points.','Inside the arc and free throws: 1; outside the arc: 2.','Binnen de boog en vrije worpen: 1; buiten de boog: 2.'],
 ['Après récupération défensive, ressortez la balle derrière l’arc ; possession limitée à 12 secondes.','After defensive recovery, clear behind the arc; possession lasts up to 12 seconds.','Na balverovering achter de boog brengen; maximaal 12 seconden balbezit.'],
],[{nom:'FIBA · présentation et règles 3x3',url:'https://about.fiba.basketball/en/our-sport/3x3-basketball'}]);
f('handball',['Handball · jeu en salle','Handball · indoor play','Handbal · zaalspel'],[
 ['Sept joueurs au maximum sur le terrain par équipe, gardien compris.','Up to seven on court per team, including the goalkeeper.','Maximaal zeven per team op het veld, inclusief doelman.'],
 ['Adultes : deux périodes de 30 minutes ; durées jeunes ou animation à préciser.','Adults: two 30-minute halves; specify youth or recreational durations.','Volwassenen: twee helften van 30 minuten; geef jeugd- of recreatieduur aan.'],
 ['Sans dribbler : au maximum trois pas et trois secondes ballon tenu.','Without dribbling: up to three steps and three seconds holding the ball.','Zonder dribbel: maximaal drie stappen en drie seconden de bal vasthouden.'],
 ['La zone du gardien et les contacts sont réglementés ; chaque but compte une fois.','Goalkeeper-area access and contact are regulated; each goal counts once.','Doelgebied en contact zijn gereglementeerd; elk doelpunt telt eenmaal.'],
],[{nom:'IHF · Rules of the Game, juillet 2025',url:'https://www.ihf.info/sites/default/files/2025-07/09A%20-%20Rules%20of%20the%20Game_Indoor%20Handball_E.pdf'}]);
f('beachvolley',['Beach-volley · double','Beach volleyball · doubles','Beachvolleybal · dubbel'],[
 ['Deux joueurs par équipe sur sable.','Two players per team on sand.','Twee spelers per team op zand.'],
 ['Deux sets gagnants : 21 points, puis 15 au troisième set ; toujours deux points d’écart.','Best of three: 21 points, 15 in the third set; always a two-point lead.','Twee gewonnen sets: 21 punten, 15 in de derde set; steeds twee punten verschil.'],
 ['Trois touches au maximum, contre compris : différence importante avec le volley en salle.','Up to three contacts including the block, unlike indoor volleyball.','Maximaal drie contacten inclusief het blok, anders dan bij zaalvolleybal.'],
 ['Annoncez tout format loisir adapté ; les règles de contacts restent celles retenues pour l’épreuve.','Announce any recreational format; use the contact rules chosen for the event.','Kondig recreatieve aanpassingen aan; pas de afgesproken contactregels toe.'],
],[{nom:'FIVB · règles et bases du beach-volley',url:'https://www.fivb.com/beach-volleyball/the-game/basic-rules/'}]);
f('rugby7',['Rugby à 7 ou Touch · choisir la variante','Sevens or Touch · choose the variant','Sevens of Touch · kies de variant'],[
 ['Rugby à 7 : sept joueurs, deux périodes de sept minutes dans le format courant.','Sevens: seven players, two seven-minute halves in the usual format.','Sevens: zeven spelers, doorgaans twee helften van zeven minuten.'],
 ['Rugby à 7 : essai 5 points, transformation 2 ; les règles de contact du rugby s’appliquent.','Sevens: try 5, conversion 2; rugby contact laws apply.','Sevens: try 5, conversie 2; de contactregels van rugby gelden.'],
 ['Touch FIT : six joueurs et toucher à la place du plaquage ; un touchdown vaut 1 point.','FIT Touch: six players, touch replaces tackling; a touchdown scores 1.','FIT Touch: zes spelers, aantikken in plaats van tackelen; een touchdown telt 1.'],
 ['Ne mélangez pas ces barèmes. Annoncez clairement la variante avant les inscriptions.','Do not mix these scoring systems. Name the variant before registration.','Meng deze puntentellingen niet. Benoem de variant vóór inschrijving.'],
],[{nom:'World Rugby · variations à sept',url:'https://passport.world.rugby/laws-of-the-game/variations-7s-10s-u19-game-on/sevens/'},{nom:'England Touch · principes FIT',url:'https://englandtouch.org.uk/play/how-to-play/guidance-for-coaches/'}],'variante');
f('rugby15',['Rugby à XV · repères','Rugby union · basics','Rugby XV · basis'],[
 ['Quinze joueurs par équipe ; le format adulte courant comporte deux périodes de 40 minutes.','Fifteen per team; the usual adult format has two 40-minute halves.','Vijftien per team; volwassenen spelen doorgaans twee helften van 40 minuten.'],
 ['Essai : 5 points ; transformation : 2 ; pénalité ou drop : 3.','Try: 5; conversion: 2; penalty goal or drop goal: 3.','Try: 5; conversie: 2; penalty of dropgoal: 3.'],
 ['Les passes à la main se font vers l’arrière ; hors-jeu et contacts sont réglementés.','Hand passes go backwards; offside and contact are regulated.','Handpasses gaan achteruit; buitenspel en contact zijn gereglementeerd.'],
 ['Le règlement d’âge et de compétition prime pour la durée, la mêlée et le contact.','Age-group and competition rules govern duration, scrums and contact.','Leeftijds- en competitieregels bepalen speelduur, scrums en contact.'],
],[{nom:'World Rugby · lois et comptage',url:'https://www.world.rugby/the-game/beginners-guide/points'},{nom:'World Rugby · lois du jeu',url:'https://passport.world.rugby/laws-of-the-game/'}]);
f('hockey',['Hockey · préciser la discipline','Hockey · specify the discipline','Hockey · bepaal de discipline'],[
 ['Précisez gazon, glace ou autre variante avant de définir les équipes et le terrain.','Specify field, ice or another variant before setting teams and the pitch.','Kies veld, ijs of een andere variant vóór teams en speelveld worden vastgelegd.'],
 ['Hockey sur gazon FIH : onze joueurs au maximum par équipe.','FIH field hockey: up to eleven players per team.','FIH-veldhockey: maximaal elf spelers per team.'],
 ['En hockey sur gazon, un but nécessite une action attaquante dans le cercle.','In field hockey, a goal requires an attacking action inside the circle.','Bij veldhockey vereist een doelpunt een aanvallende actie binnen de cirkel.'],
 ['Ces repères ne sont pas les règles du hockey sur glace ; indiquez le règlement effectivement choisi.','These are not ice hockey rules; state the actual rules being used.','Dit zijn geen ijshockeyregels; vermeld het werkelijk gebruikte reglement.'],
],[{nom:'FIH · Rules of Hockey et variantes',url:'https://www.fih.hockey/about-fih/official-documents/rules-of-hockey'}],'variante');
f('hockeysalle',['Hockey en salle · FIH','Indoor hockey · FIH','Zaalhockey · FIH'],[
 ['Six joueurs par équipe au maximum, gardien compris.','Up to six players per team, including the goalkeeper.','Maximaal zes spelers per team, inclusief doelman.'],
 ['Repère : quatre quarts-temps de dix minutes.','Reference format: four ten-minute quarters.','Basisformaat: vier kwarten van tien minuten.'],
 ['Le ballon se pousse ; les frappes et balayages ne se traitent pas comme au gazon.','The ball is pushed; hits and sweeps do not follow outdoor rules.','De bal wordt gepusht; slaan en flatsen volgen niet de veldregels.'],
 ['Annoncez les adaptations locales et le départage avant la rencontre.','Announce local adaptations and tie-breaks before the match.','Kondig lokale aanpassingen en beslissingsregels vóór de wedstrijd aan.'],
],[{nom:'FIH · principes du hockey en salle',url:'https://www.fih.hockey/events/fih-indoor-world-cup-croatia-2025/news/indoor-hockey-fast-intense-and-packed-with-skill'},{nom:'FIH · règles en salle',url:'https://www.fih.hockey/about-fih/official-documents/rules-of-hockey'}]);
f('ultimate',['Ultimate · sans contact','Ultimate · non-contact','Ultimate · zonder contact'],[
 ['Format extérieur courant : sept joueurs par équipe.','Usual outdoor format: seven players per team.','Gebruikelijk buitenformaat: zeven spelers per team.'],
 ['Un point lorsqu’une passe est réceptionnée dans la zone d’en-but adverse.','Score by catching a pass in the opposing end zone.','Een punt door een pass in de eindzone van de tegenstander te vangen.'],
 ['Ne courez pas avec le disque ; passez-le. Une passe incomplète rend la possession à l’adversaire.','Do not run with the disc; pass it. An incomplete pass gives opponents possession.','Loop niet met de schijf; pas hem. Een onvolledige pass geeft de tegenstander balbezit.'],
 ['Auto-arbitrage et esprit du jeu ; annoncez objectif de points et limite de temps.','Self-officiating and Spirit of the Game; announce target and time cap.','Zelfarbitrage en Spirit of the Game; kondig puntendoel en tijdslimiet aan.'],
],[{nom:'WFDF · Ultimate',url:'https://wfdf.sport/disciplines/ultimate/'}]);
f('waterpolo',['Water-polo · jeu à sept','Water polo · seven-a-side','Waterpolo · zeven tegen zeven'],[
 ['Format à sept dans l’eau, avec gardien ou composition autorisée par le règlement.','Seven in the water, with goalkeeper or a lineup permitted by the rules.','Zeven in het water, met doelman of een volgens het reglement toegestane opstelling.'],
 ['Repère standard : quatre périodes de huit minutes effectives.','Standard reference: four periods of eight minutes of actual play.','Standaard: vier periodes van acht minuten zuivere speeltijd.'],
 ['Un but vaut un point ; exclusions et possessions demandent un chronométrage propre.','A goal scores once; exclusions and possessions need separate timing.','Een doelpunt telt eenmaal; uitsluitingen en balbezit vragen eigen tijdwaarneming.'],
 ['Le water-polo à quatre est une autre formule : annoncez la bonne variante.','Four-a-side water polo is a separate format: name the correct variant.','Vier-tegen-vier is een apart formaat: benoem de juiste variant.'],
],[{nom:'World Aquatics · Competition Regulations 2026',url:'https://www.worldaquatics.com/rules/competition-regulations'},{nom:'Water Polo Canada · bases du jeu',url:'https://www.waterpolo.ca/content/Water-Polo-Basic-Rules'}]);
f('baseball',['Baseball · manches et courses','Baseball · innings and runs','Honkbal · innings en runs'],[
 ['Les équipes alternent attaque et défense ; trois retraits terminent une demi-manche.','Teams alternate batting and fielding; three outs end a half-inning.','Teams wisselen slag- en veldbeurt; drie nullen beëindigen een halve inning.'],
 ['Un joueur qui parcourt légalement les bases et revient au marbre rapporte une course.','A runner legally completing the bases and reaching home scores a run.','Een loper die reglementair alle honken en de thuisplaat bereikt scoort een run.'],
 ['Le nombre de manches dépend de la catégorie et du tournoi ; il n’est pas toujours neuf.','Inning count depends on age group and event; it is not always nine.','Het aantal innings hangt af van leeftijd en evenement; niet altijd negen.'],
 ['Annoncez limites de temps, écarts arrêtant la partie et règle des manches supplémentaires.','Announce time limits, run-ahead endings and extra-inning rules.','Kondig tijdslimieten, run-ahead-regels en extra innings aan.'],
],[{nom:'WBSC · Official Rules of Baseball 2025–2026',url:'https://static.wbsc.org/uploads/federations/8/cms/documents/a2e667cb-d9f7-222f-51eb-ed71b45b8173.pdf'}]);
f('softball',['Softball · préciser le lancer','Softball · specify pitching style','Softbal · bepaal de werpvariant'],[
 ['Choisissez fast pitch ou slow pitch : équipes, lancers et certaines règles diffèrent.','Choose fast pitch or slow pitch: lineups, pitching and some rules differ.','Kies fastpitch of slowpitch: opstelling, werpen en sommige regels verschillen.'],
 ['On marque des courses en parcourant les bases jusqu’au marbre.','Score runs by completing the bases and reaching home.','Scoor runs door de honken en de thuisplaat te bereiken.'],
 ['Le format international usuel comporte sept manches ; les adaptations sont à annoncer.','The usual international format has seven innings; announce adaptations.','Het gebruikelijke internationale formaat heeft zeven innings; kondig aanpassingen aan.'],
 ['Fixez avant le tournoi : durée, manches, écarts d’arrêt et départage.','Set duration, innings, run-ahead endings and tie-breaks before play.','Leg speelduur, innings, run-ahead-regels en beslissingen vooraf vast.'],
],[{nom:'IWGA / WBSC · softball',url:'https://www.theworldgames.org/sports/Baseball-Softball-40'}],'variante');
f('padel',['Padel · score et service','Padel · scoring and service','Padel · score en service'],[
 ['Le double est la formule habituelle ; service après rebond, frappé sous la taille.','Doubles is usual; serve after a bounce, striking below waist level.','Dubbelspel is gebruikelijk; service na een stuit, onder taillehoogte geraakt.'],
 ['Score en jeux : 15, 30, 40 ; un set se joue usuellement à six jeux.','Game scoring: 15, 30, 40; sets usually go to six games.','Puntentelling: 15, 30, 40; sets doorgaans tot zes games.'],
 ['Annoncez à 40–40 : avantages, point décisif ou Star Point selon le règlement retenu.','At deuce, announce advantage, golden point or Star Point under the chosen rules.','Kies bij deuce voordeel, golden point of Star Point volgens het reglement.'],
 ['Les parois interviennent après le rebond autorisé ; précisez le format du set décisif.','Walls may be used after a legal bounce; specify the deciding-set format.','Wanden mogen na een geldige stuit worden gebruikt; bepaal de beslissende set.'],
],[{nom:'FIP · Rules of Padel, édition 2026',url:'https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf'}]);
f('squash',['Squash · simple','Squash · singles','Squash · enkelspel'],[
 ['Chaque échange rapporte un point ; manche à 11, avec deux points d’écart.','Each rally scores a point; games to 11, win by two.','Elke rally levert een punt op; games tot 11 met twee punten verschil.'],
 ['Match courant en trois manches gagnantes ; toute formule courte doit être annoncée.','Usual match: best of five; announce any shorter format.','Gebruikelijk: drie gewonnen games; kondig een kortere formule aan.'],
 ['Un seul service. Renvoyez la balle sur le mur frontal avant son deuxième rebond.','One serve. Return to the front wall before the second bounce.','Eén service. Speel vóór de tweede stuit tegen de voormuur.'],
 ['En cas de gêne ou de danger, arrêtez le geste et faites arbitrer let ou stroke.','For interference or danger, stop and have a let or stroke adjudicated.','Stop bij hinder of gevaar en laat let of stroke beoordelen.'],
],[{nom:'World Squash Officiating · règles 2025',url:'https://worldsquashofficiating.com/rules-of-squash/'}]);
f('pickleball',['Pickleball · repères de départ','Pickleball · getting started','Pickleball · beginregels'],[
 ['Simple ou double ; objectif courant de 11 points avec deux points d’écart.','Singles or doubles; usually to 11 points, win by two.','Enkel of dubbel; doorgaans tot 11 punten met twee punten verschil.'],
 ['Après le service, chaque camp laisse un rebond avant de pouvoir jouer à la volée.','After the serve, each side must allow one bounce before volleying.','Na de service moet elke zijde één stuit toestaan vóór volleyen mag.'],
 ['Pas de volée dans la zone de non-volée, dite kitchen.','No volleying in the non-volley zone, known as the kitchen.','Geen volley in de niet-volleyzone, de kitchen.'],
 ['Annoncez le comptage : points au service ou rally scoring, et le nombre de manches.','Announce side-out or rally scoring, and the number of games.','Kondig side-out- of rallytelling en het aantal games aan.'],
],[{nom:'USA Pickleball · règles et résumé 2026',url:'https://usapickleball.org/rules/summary/'}]);
f('beachtennis',['Beach tennis · sans rebond','Beach tennis · no bounce','Beachtennis · zonder stuit'],[
 ['La balle se joue à la volée : aucun rebond sur le sable.','Play volleys: no bounce on the sand.','Speel volleys: geen stuit op het zand.'],
 ['Un seul service ; pas de let. Un service touchant le filet peut rester bon.','One serve; no let. A serve touching the net may remain valid.','Eén service; geen let. Een netservice kan geldig blijven.'],
 ['Score 15, 30, 40 et point décisif à égalité, dans le format standard.','Standard scoring: 15, 30, 40, with a deciding point at deuce.','Standaard: 15, 30, 40, met beslissend punt bij deuce.'],
 ['Précisez simple ou double, hauteur du filet et format des sets selon la catégorie.','Specify singles or doubles, net height and set format for the category.','Bepaal enkel of dubbel, nethoogte en setformaat per categorie.'],
],[{nom:'FFT · règles du beach tennis',url:'https://www.fft.fr/actualites/regles-beach-tennis'},{nom:'ITF · Rules of Beach Tennis 2026',url:'https://www.itftennis.com/media/15548/rules-of-beach-tennis-2026.pdf'}]);
f('speedbadminton',['Crossminton · sans filet','Crossminton · no net','Crossminton · zonder net'],[
 ['Chaque joueur défend son carré ; aucun filet ne sépare les deux camps.','Each player defends a square; no net divides the courts.','Elke speler verdedigt een vierkant; er is geen net.'],
 ['Une manche se gagne à 16 points, avec deux points d’écart à partir de 15–15.','Games to 16; a two-point lead is needed from 15-all.','Games tot 16; vanaf 15–15 zijn twee punten verschil nodig.'],
 ['Match en deux manches gagnantes ; le volant au sol dans le carré adverse rapporte un point.','Best of three; landing the shuttle in the opposing square scores a point.','Twee gewonnen games; de shuttle op de grond in het andere vierkant levert een punt op.'],
 ['Le service alterne selon le règlement ICO, puis à chaque point à 15–15.','Service rotates under ICO rules, then every point at 15-all.','Service wisselt volgens ICO-regels, daarna elk punt bij 15–15.'],
],[{nom:'ICO · règles de crossminton',url:'https://crossminton.org/the-rules/'}]);
f('bowling',['Bowling · dix quilles','Bowling · ten-pin','Bowling · tien kegels'],[
 ['Une partie comporte dix frames ; normalement deux lancers par frame.','A game has ten frames; normally two deliveries per frame.','Een game heeft tien frames; normaal twee worpen per frame.'],
 ['Strike : 10 plus les deux lancers suivants ; spare : 10 plus le lancer suivant.','Strike: 10 plus the next two deliveries; spare: 10 plus the next delivery.','Strike: 10 plus de volgende twee worpen; spare: 10 plus de volgende worp.'],
 ['Un strike ou spare à la dixième frame donne les lancers bonus prévus.','A strike or spare in the tenth frame grants the relevant bonus deliveries.','Een strike of spare in frame tien geeft de bijbehorende bonusworpen.'],
 ['Reportez le total officiel de la piste ; le compteur Tourneo n’automatise pas ces bonus.','Enter the lane’s official total; Tourneo’s counter does not calculate these bonuses.','Voer het officiële baantotaal in; Tourneo berekent deze bonussen niet automatisch.'],
],[{nom:'International Bowling Federation · règles de jeu',url:'https://bowling.sport/universal-playing-rules-chapter-2/'}]);
f('billard',['Billard · choisir la discipline','Billiards · choose the discipline','Biljart · kies de discipline'],[
 ['Annoncez huit-ball, neuf-ball, blackball, carambole ou autre : les règles ne sont pas interchangeables.','Name eight-ball, nine-ball, blackball, carom or another game: rules differ.','Benoem eight-ball, nine-ball, blackball, carambole of een ander spel: regels verschillen.'],
 ['Au huit-ball WPA, on termine son groupe avant d’empocher régulièrement la huit.','In WPA eight-ball, clear your group before legally pocketing the eight.','Bij WPA-eight-ball eerst de eigen groep wegspelen en dan reglementair de acht potten.'],
 ['Précisez fautes, casse, bille en main et annonces de poches selon cette discipline.','Specify fouls, breaks, ball in hand and pocket calls for that discipline.','Leg fouten, break, ball-in-hand en het aanwijzen van pockets voor die discipline vast.'],
 ['Dans Tourneo, distinguez manches gagnées et points d’une discipline à total.','In Tourneo, distinguish racks won from cumulative scoring disciplines.','Maak in Tourneo onderscheid tussen gewonnen racks en disciplines met totaalscore.'],
],[{nom:'WPA · règles des disciplines pool',url:'https://wpapool.com/rules/'}],'variante');
f('babyfoot',['Baby-foot · repères ITSF','Table football · ITSF basics','Tafelvoetbal · ITSF-basis'],[
 ['Simple ou double ; le nombre de buts et de manches dépend de l’épreuve.','Singles or doubles; goals and game count depend on the event.','Enkel of dubbel; aantal goals en games hangt af van het evenement.'],
 ['Chaque but valable compte une fois. Annoncez la règle à égalité dans la dernière manche.','Each valid goal counts once. Announce deciding-game tie-break rules.','Elke geldige goal telt eenmaal. Kondig de beslissingsregel in de laatste game aan.'],
 ['Les roulettes incontrôlées et secousses de table ne sont pas autorisées.','Uncontrolled rod spinning and table jarring are not allowed.','Ongecontroleerd draaien van stangen en schokken aan de tafel zijn niet toegestaan.'],
 ['Les règles de café peuvent différer : annoncez le règlement avant le premier match.','House rules may differ: announce the rules before the first match.','Caféregels kunnen verschillen: kondig de regels vóór de eerste wedstrijd aan.'],
],[{nom:'ITSF · Standard Matchplay Rules',url:'https://www.tablesoccer.org/rules/'}]);
f('cornhole',['Cornhole · comptage par différence','Cornhole · cancellation scoring','Cornhole · verschilscore'],[
 ['Quatre sacs par camp et par manche de lancer.','Four bags per side per round.','Vier zakjes per kant per ronde.'],
 ['Sac sur la planche : 1 point ; dans le trou : 3 points.','On the board: 1 point; through the hole: 3.','Op het bord: 1 punt; door het gat: 3.'],
 ['Seule la différence entre les deux camps s’ajoute au score du tour.','Only the difference between the sides is added after the round.','Alleen het verschil tussen beide kanten wordt na de ronde toegevoegd.'],
 ['Référence ACA : 21 points ou plus, sans retour en arrière pour dépassement ; distance adulte 8,23 m.','ACA reference: 21 or more, no bust reset; adult distance 8.23 m.','ACA: 21 of meer, geen terugzet bij overschrijding; volwassenenafstand 8,23 m.'],
],[{nom:'American Cornhole Association · règles',url:'https://www.playcornhole.org/pages/rules'}]);
f('palets',['Palets · choisir la variante','Palet games · choose a variant','Paletspellen · kies een variant'],[
 ['Précisez le support : bois, plomb ou autre, ainsi que les palets autorisés.','Specify wood, lead or another board, and permitted discs.','Bepaal hout, lood of een andere ondergrond, en toegestane schijven.'],
 ['Distance de lancer, objectif de points et composition des équipes dépendent de la variante.','Throwing distance, target and team sizes depend on the variant.','Werpafstand, puntendoel en teamgrootte hangen af van de variant.'],
 ['N’appliquez pas automatiquement les règles du palet breton à un jeu sur plomb.','Do not automatically apply Breton wooden-board rules to lead-board games.','Pas Bretonse regels voor een houten bord niet automatisch toe op een loden bord.'],
 ['Avant le tirage, annoncez mesure, égalités et sort des palets hors support.','Before the draw, state measuring, ties and off-board rules.','Leg vóór de loting meten, gelijke ligging en schijven buiten het bord vast.'],
],[{nom:'FNSMR · règlements des jeux de palet',url:'https://www.le-palet.com/?m=equipement'}],'variante');
f('palets-bretons',['Palets bretons · planche en bois','Breton palet · wooden board','Bretonse palet · houten bord'],[
 ['Lancez depuis cinq mètres sur la planche ; approchez le petit palet, le maître.','Throw from five metres onto the board, aiming near the small target disc.','Werp vanaf vijf meter op het bord, dicht bij het kleine doelschijfje.'],
 ['Chaque palet mieux placé que le meilleur adverse vaut un point.','Each disc closer than the nearest opposing disc scores one point.','Elke schijf dichterbij dan de beste tegenstander telt één punt.'],
 ['Le camp qui n’a pas le point rejoue jusqu’à reprendre le point ou épuiser ses palets.','The side not holding the point throws until closer or out of discs.','De kant die niet het punt heeft werpt tot hij dichterbij ligt of geen schijven meer heeft.'],
 ['Format usuel : 12 points, belle à 15 ; annoncez tout format local différent.','Usual format: 12 points, deciding game to 15; announce local differences.','Gebruikelijk: 12 punten, beslissende game tot 15; kondig lokale afwijkingen aan.'],
],[{nom:'Jeu de palet · règle publiée par le fabricant',url:'https://www.jeudepalet.fr/regles-du-jeu/'}]);
f('molkky',['Mölkky · atteindre exactement cinquante','Mölkky · reach exactly fifty','Mölkky · bereik precies vijftig'],[
 ['Une quille seule vaut son numéro ; plusieurs valent leur nombre.','One pin scores its number; multiple pins score the number of pins.','Eén kegel telt zijn nummer; meerdere tellen het aantal kegels.'],
 ['Atteignez exactement 50 points ; dépasser 50 ramène le total à 25.','Reach exactly 50; exceeding 50 resets the total to 25.','Bereik precies 50; boven 50 wordt het totaal 25.'],
 ['Trois lancers sans point consécutifs éliminent le joueur ou l’équipe selon la formule.','Three consecutive scoreless throws eliminate the player or team under the chosen format.','Drie worpen zonder punten achter elkaar schakelen de speler of het team uit.'],
 ['Relevez les quilles où elles sont tombées. Le dernier joueur non éliminé peut aussi gagner.','Stand pins where they fell. The last non-eliminated player can also win.','Zet kegels recht waar ze vielen. Ook de laatst overgebleven speler kan winnen.'],
],[{nom:'Mölkky · règles du fabricant',url:'https://www.molkky.com/fr/regles/'},{nom:'Fédération Française de Mölkky · règles',url:'https://ff-molkky.fr/regles/'}]);
f('kubb',['Kubb · le roi en dernier','Kubb · king last','Kubb · de koning als laatste'],[
 ['Deux équipes lancent les bâtons pour renverser les kubbs adverses.','Two teams throw batons to topple opposing kubbs.','Twee teams werpen stokken om de kubbs van de tegenstander om te gooien.'],
 ['Les kubbs de terrain se traitent avant ceux de la ligne de fond.','Field kubbs must be cleared before baseline kubbs.','Veldkubbs moeten vóór basiskubbs worden omgegooid.'],
 ['Renversez le roi seulement après tous les kubbs adverses ; trop tôt, vous perdez.','Topple the king only after all opposing kubbs; doing so early loses.','Gooi de koning pas na alle andere kubbs om; te vroeg betekent verlies.'],
 ['Annoncez les dimensions, la répartition des lancers et la limite de temps du tournoi.','Announce court dimensions, throw allocation and tournament time limits.','Kondig veldafmetingen, verdeling van worpen en tijdslimieten aan.'],
],[{nom:'Kubb-VM · règles du championnat',url:'https://www.kubbvm.com/en/about-the-kubb-world-championship/rules-in-the-wc/'},{nom:'American Kubb Association · règles',url:'https://kubbamerica.org/rules/'}]);
f('spikeball',['Roundnet · jeu autour du filet','Roundnet · play around the net','Roundnet · rond het net'],[
 ['Deux joueurs par équipe dans la formule courante.','Two players per team in the usual format.','Twee spelers per team in het gebruikelijke formaat.'],
 ['Trois touches au maximum pour renvoyer sur le filet, en alternant les partenaires.','Up to three alternating team contacts to return the ball onto the net.','Maximaal drie afwisselende teamcontacten om op het net terug te spelen.'],
 ['Un échange gagné rapporte un point ; objectif et écart dépendent du règlement annoncé.','Winning a rally scores a point; target and margin follow the announced rules.','Een gewonnen rally levert een punt op; doel en verschil volgen de afgesproken regels.'],
 ['Après le service, le jeu se déroule autour du filet ; évitez toute gêne adverse.','After the serve, play moves around the net; avoid interfering with opponents.','Na de service speelt men rond het net; hinder tegenstanders niet.'],
],[{nom:'International Roundnet Federation · règles',url:'https://www.roundnetfederation.org/official-rules'},{nom:'Roundnet Belgium · formats',url:'https://www.roundnetbelgium.be/rules/'}]);
f('airhockey',['Air hockey · partie en sept','Air hockey · games to seven','Airhockey · games tot zeven'],[
 ['Chaque but valable rapporte un point ; le premier à sept gagne la partie.','Each valid goal scores one; first to seven wins the game.','Elk geldig doelpunt telt één; als eerste zeven wint de game.'],
 ['Le joueur qui encaisse remet le palet en jeu.','The player conceding the goal restarts with the puck.','De speler die een doelpunt incasseert brengt de puck weer in het spel.'],
 ['Un seul poussoir par joueur ; pas de blocage du palet sous le poussoir ni avec la main.','One mallet per player; no trapping under the mallet or touching with the hand.','Eén mallet per speler; niet onder de mallet klemmen of met de hand aanraken.'],
 ['Annoncez le nombre de parties gagnantes ; les réglages de la table peuvent différer.','Announce games needed to win; table settings may differ.','Kondig het aantal gewonnen games aan; tafelinstellingen kunnen verschillen.'],
],[{nom:'USAA · règles publiées par Gold Standard Air Hockey',url:'https://goldstandardairhockey.com/usaa-official-rules-of-air-hockey/'}]);
f('carrom',['Carrom · pions et reine','Carrom · pieces and queen','Carrom · schijven en koningin'],[
 ['À l’aide du percuteur, empochez les pions de votre couleur.','Use the striker to pocket pieces of your colour.','Pot met de striker de schijven van je kleur.'],
 ['La reine doit être couverte par un pion de sa couleur selon les règles du tour.','The queen must be covered with an own-colour piece under the turn rules.','De koningin moet volgens de beurtregels met een eigen schijf worden gedekt.'],
 ['Empocher le percuteur entraîne une pénalité ; convenez du règlement de compétition retenu.','Pocketing the striker incurs a penalty; agree on the competition rules.','De striker potten levert een straf op; spreek het competitiereglement af.'],
 ['Annoncez le nombre de plateaux ou l’objectif de points avant le début.','Announce board count or target score before starting.','Kondig het aantal borden of de puntenscore vooraf aan.'],
],[{nom:'Indian Carrom Federation · Laws of Carrom',url:'https://www.indiancarrom.co.in/laws-of-carrom/'},{nom:'Fédération Française de Carrom · jouer',url:'https://carrom.net/jouer-au-carrom/'}]);
f('quilles',['Jeux de quilles · préciser le jeu','Skittle games · specify the game','Kegelspellen · bepaal het spel'],[
 ['Choisissez la discipline : quilles de neuf, de huit, bowling ou jeu traditionnel.','Choose the discipline: nine-pin, eight-pin, bowling or a traditional game.','Kies de discipline: negen kegels, acht kegels, bowling of een traditioneel spel.'],
 ['Précisez nombre de quilles, distance, ordre et nombre de lancers par participant.','Specify pin count, distance, turn order and deliveries per participant.','Leg aantal kegels, afstand, beurtvolgorde en worpen per deelnemer vast.'],
 ['Annoncez le barème, les remises en place et le départage.','Announce scoring, resetting and tie-breaks.','Kondig puntentelling, terugzetten en beslissingsregels aan.'],
 ['Il n’existe pas un barème unique applicable à tous les jeux de quilles.','No single scoring system applies to every skittle game.','Er bestaat geen puntentelling die voor alle kegelspellen geldt.'],
],[],'cadre');
f('echecs',['Échecs · résultat et cadence','Chess · result and time control','Schaken · resultaat en speeltempo'],[
 ['Deux joueurs ; les blancs commencent. Le but est le mat, pas la capture du roi.','Two players; White starts. The aim is checkmate, not capturing the king.','Twee spelers; wit begint. Het doel is mat, niet de koning slaan.'],
 ['Le pat est une partie nulle. D’autres nulles existent selon les lois FIDE.','Stalemate is a draw. Other draws are defined by FIDE laws.','Pat is remise. Andere remises volgen uit de FIDE-regels.'],
 ['Annoncez la cadence, l’incrément et les règles de pendule avant la ronde.','Announce time control, increment and clock rules before the round.','Kondig speeltempo, increment en klokregels vóór de ronde aan.'],
 ['Pour un duel dans Tourneo : victoire 1–0, nulle 0–0 ; ajustez les points de classement séparément.','For Tourneo duels: win 1–0, draw 0–0; set standings points separately.','Voor Tourneo-duels: winst 1–0, remise 0–0; stel klassementspunten apart in.'],
],[{nom:'FIDE · Laws of Chess',url:'https://handbook.fide.com/chapter/E012023'}]);
f('dames',['Dames · choisir le damier','Draughts · choose the board','Dammen · kies het bord'],[
 ['Dames internationales : damier de cent cases ; d’autres variantes utilisent soixante-quatre cases.','International draughts uses 100 squares; other variants use 64.','Internationaal dammen gebruikt 100 velden; andere varianten gebruiken 64.'],
 ['La prise est obligatoire ; le choix des prises dépend de la variante.','Capturing is compulsory; capture selection depends on the variant.','Slaan is verplicht; welke slag gekozen wordt hangt af van de variant.'],
 ['En international, la prise du plus grand nombre de pièces est obligatoire.','International rules require capturing the greatest number of pieces.','Internationale regels verplichten de slag met de meeste stukken.'],
 ['Annoncez cadence, nulles et résultat avant de commencer ; ne mélangez pas les variantes.','Announce time control, draws and results; do not mix variants.','Kondig speeltempo, remises en resultaten aan; meng varianten niet.'],
],[{nom:'FMJD · atlas des variantes et règles',url:'https://www.fmjd.org/variants/'}],'variante');
f('puissance4',['Puissance 4 · aligner quatre jetons','Connect 4 · four in a row','Vier op een rij · vier verbinden'],[
 ['À tour de rôle, laissez tomber un jeton dans une colonne non pleine.','Take turns dropping one disc into a non-full column.','Laat om de beurt één schijf in een niet-volle kolom vallen.'],
 ['Quatre jetons de votre couleur alignés horizontalement, verticalement ou en diagonale font gagner.','Four of your colour horizontally, vertically or diagonally wins.','Vier van je kleur horizontaal, verticaal of diagonaal winnen.'],
 ['Une grille pleine sans alignement gagnant est un match nul.','A full board without a winning line is a draw.','Een vol bord zonder winnende lijn is gelijkspel.'],
 ['Annoncez le nombre de manches et alternez le premier joueur.','Announce game count and alternate the starting player.','Kondig het aantal games aan en wissel de startspeler af.'],
],[{nom:'Hasbro · notice Puissance 4 original',url:'https://instructions.hasbro.com/en-us/instruction/Connect-4-Game'}]);
f('backgammon',['Backgammon · sortie des pions','Backgammon · bearing off','Backgammon · stenen uitspelen'],[
 ['Déplacez vos quinze pions selon les dés pour les ramener puis les sortir.','Move your fifteen checkers by the dice, bring them home and bear off.','Verplaats je vijftien stenen volgens de dobbelstenen naar huis en speel ze uit.'],
 ['Un double donne quatre déplacements du nombre obtenu.','Doubles give four moves of the rolled number.','Een dubbel geeft vier zetten met het gegooide getal.'],
 ['Une pièce frappée passe par la barre avant de rentrer en jeu.','A hit checker goes to the bar before re-entering.','Een geslagen steen gaat op de bar vóór hij opnieuw inkomt.'],
 ['Annoncez les points du match et le videau ; Tourneo ne calcule pas automatiquement gammons et videau.','Announce match points and cube rules; Tourneo does not calculate gammons or cube values.','Kondig matchpunten en verdubbelregels aan; Tourneo berekent gammons en kubuswaarden niet automatisch.'],
],[{nom:'US Backgammon Federation · principes de jeu',url:'https://usbgf.org/backgammon-basics-how-to-play/'}]);
f('dominos',['Dominos · choisir la règle','Dominoes · choose the rules','Domino · kies de regels'],[
 ['Précisez le jeu de dominos, le nombre de joueurs et la distribution.','Specify the domino set, player count and deal.','Bepaal de dominoset, het aantal spelers en de verdeling.'],
 ['Pour une chaîne classique, les extrémités jointes doivent porter le même nombre.','In a usual chain game, joined ends must have matching numbers.','Bij een gebruikelijk kettingspel moeten aansluitende uiteinden hetzelfde getal tonen.'],
 ['Choisissez pioche ou blocage, puis comment compter les dominos restants.','Choose draw or block rules, then how remaining tiles score.','Kies trek- of blokregels en bepaal hoe overblijvende stenen tellen.'],
 ['Annoncez si le gagnant a le plus ou le moins de points ; ne comparez pas des barèmes différents.','State whether high or low score wins; do not mix scoring systems.','Geef aan of hoge of lage score wint; meng puntentellingen niet.'],
],[],'variante');
f('scrabble',['Scrabble · classique ou duplicate','Scrabble · classic or duplicate','Scrabble · klassiek of duplicate'],[
 ['Classique : chaque joueur gère son tirage ; duplicate : tous jouent le même tirage.','Classic: individual racks; duplicate: everyone plays the same rack.','Klassiek: eigen rek; duplicate: iedereen speelt dezelfde letters.'],
 ['Les cases multiplicatrices s’appliquent à la pose ; un joker a une valeur de zéro.','Premium squares apply when played; a blank scores zero.','Premievakken tellen bij het leggen; een blanco telt nul.'],
 ['Poser les sept lettres en un coup ajoute une prime de 50 points.','Playing all seven tiles in one turn adds a 50-point bonus.','Alle zeven letters in één beurt leggen geeft 50 bonuspunten.'],
 ['Annoncez dictionnaire, temps de réflexion et contestations ; reportez le résultat officiel.','Announce dictionary, thinking time and challenges; record the official result.','Bepaal woordenlijst, bedenktijd en betwistingen; noteer het officiële resultaat.'],
],[{nom:'FFSc · règlements classique et duplicate',url:'https://www.ffsc.fr/arbitrage.php?page=reglement'},{nom:'Fédération Royale Belge de Scrabble · découverte',url:'https://royal.frbs.be/royal/index.php/acces-direct/le-scrabble/decouvrir-le-scrabble'}],'variante');
f('mahjong',['Mah-jong · MCR ou riichi','Mahjong · MCR or riichi','Mahjong · MCR of riichi'],[
 ['Précisez MCR, riichi ou autre variante : mains et décomptes ne sont pas interchangeables.','Specify MCR, riichi or another variant: hands and scoring differ.','Kies MCR, riichi of een andere variant: handen en telling verschillen.'],
 ['Le score cumulé, et non le seul nombre de mains gagnées, détermine le classement.','Cumulative points, not just hands won, determine the ranking.','Het puntentotaal, niet alleen gewonnen handen, bepaalt de rangschikking.'],
 ['Annoncez rotations, durée des tables, points initiaux et pénalités.','Announce rotations, table duration, starting points and penalties.','Leg rotaties, tafeltijd, beginpunten en straffen vast.'],
 ['Une table à plusieurs joueurs n’est pas un duel ; ne transformez pas ses scores en face-à-face fictifs.','A multiplayer table is not a duel; do not convert scores into fictitious head-to-head results.','Een tafel met meerdere spelers is geen duel; maak er geen fictieve onderlinge uitslagen van.'],
],[{nom:'European Mahjong Association · MCR',url:'https://mahjong-europe.org/portal/index.php?Itemid=167&id=31&option=com_content&view=article'},{nom:'European Mahjong Association · riichi 2026',url:'https://mahjong-europe.org/portal/index.php?Itemid=166&id=30&option=com_content&view=article'}],'variante');
f('belote',['Belote · choisir classique ou coinche','Belote · classic or coinche','Belote · klassiek of coinche'],[
 ['Classique : quatre joueurs, deux équipes, jeu de trente-deux cartes.','Classic: four players, two teams, a 32-card deck.','Klassiek: vier spelers, twee teams, 32 kaarten.'],
 ['Annoncez la variante et les annonces ; les obligations de couleur et d’atout suivent ce choix.','Name the variant and meld rules; following suit and trump obligations follow that choice.','Benoem variant en meldingen; kleur- en troefverplichtingen volgen die keuze.'],
 ['Belote-rebelote : roi et dame d’atout valent 20 points selon les annonces requises.','Belote-rebelote: trump king and queen score 20 with the required calls.','Belote-rebelote: troefheer en -vrouw tellen 20 met de vereiste meldingen.'],
 ['Le contrat et le capot dépendent du règlement annoncé ; reportez le total validé de chaque équipe.','Contract and capot rules depend on the announced format; enter validated team totals.','Contract en capot volgen de afgesproken regels; voer goedgekeurde teamtotalen in.'],
],[{nom:'Fédération Française de Belote · règles',url:'https://www.ffbelote.org/reglements-de-la-belote-avec-ou-sans-annonce/'}],'variante');
f('tarot',['Tarot · contrat et bouts','French tarot · contract and bouts','Frans tarot · contract en bouts'],[
 ['Jeu de 78 cartes ; le format officiel courant se joue à quatre.','A 78-card deck; usual official format uses four players.','Een spel van 78 kaarten; het gebruikelijke officiële formaat heeft vier spelers.'],
 ['Objectif du preneur : 56, 51, 41 ou 36 points avec respectivement zéro, un, deux ou trois bouts.','Declarer target: 56, 51, 41 or 36 points with zero, one, two or three bouts.','Doel van de nemer: 56, 51, 41 of 36 punten met nul, één, twee of drie bouts.'],
 ['Contrat, primes et pénalités déterminent le résultat ; ne saisissez pas seulement les plis gagnés.','Contract, bonuses and penalties determine the result; do not enter just tricks won.','Contract, bonussen en straffen bepalen de uitslag; voer niet alleen gewonnen slagen in.'],
 ['Les totaux peuvent être négatifs ; le tournoi en duels ne remplace pas une feuille de scores à quatre.','Totals may be negative; a duel tournament does not replace a four-player score sheet.','Totalen kunnen negatief zijn; een dueltoernooi vervangt geen scoreblad voor vier spelers.'],
],[{nom:'Fédération Française de Tarot · règlement donnes libres',url:'https://fftarot.fr/assets/documents/ReglementFFT_DonnesLibres.pdf'}],'variante');
f('uno',['UNO · jeu classique','UNO · classic game','UNO · klassiek spel'],[
 ['Jouez une carte de même couleur, numéro ou symbole, ou un joker autorisé.','Play a matching colour, number or symbol, or a permitted wild card.','Speel dezelfde kleur, hetzelfde cijfer of symbool, of een toegestane joker.'],
 ['Annoncez UNO lorsqu’il ne vous reste qu’une carte.','Call UNO when you have one card left.','Roep UNO wanneer je nog één kaart hebt.'],
 ['Le +4 classique nécessite de ne pas avoir la couleur demandée ; une contestation est possible.','A classic +4 requires having no matching-colour card; it can be challenged.','Een klassieke +4 vereist dat je de gevraagde kleur niet hebt; aanvechten is mogelijk.'],
 ['Le cumul des +2/+4 n’est pas une règle classique universelle ; précisez édition et score du tournoi.','Stacking +2/+4 is not a universal classic rule; specify edition and tournament scoring.','+2/+4 stapelen is geen algemene klassieke regel; bepaal editie en toernooitelling.'],
],[{nom:'Mattel · notice UNO classique',url:'https://service.mattel.com/instruction_sheets/42001pr.pdf'}]);
const cadres:[string,Texte,Texte[]][]=[
 ['cartes',['Jeux de cartes · identifier le jeu','Card games · identify the game','Kaartspellen · bepaal het spel'],[
 ['Nommez le jeu, sa variante, le paquet utilisé et le nombre de joueurs.','Name the game, variant, deck and player count.','Benoem spel, variant, kaartspel en aantal spelers.'],
 ['Annoncez distribution, annonces, pénalités et conditions de victoire.','Announce the deal, calls, penalties and winning conditions.','Bepaal verdeling, meldingen, straffen en winstvoorwaarden.'],
 ['Indiquez si le résultat est individuel ou par équipe, et si les scores peuvent être négatifs.','Specify individual or team results, and whether scores can be negative.','Bepaal individuele of teamuitslagen en of scores negatief kunnen zijn.'],
 ]],
 ['jeuxsociete',['Jeux de société · notice de l’édition','Board games · edition rules','Bordspellen · regels van de editie'],[
 ['Retenez une édition et une notice identiques pour toutes les tables.','Use the same edition and rulebook at every table.','Gebruik op elke tafel dezelfde editie en spelregels.'],
 ['Annoncez les extensions, la limite de temps et le départage.','Announce expansions, time limits and tie-breaks.','Bepaal uitbreidingen, tijdslimieten en beslissingsregels.'],
 ['Vérifiez si le jeu accepte un duel ou exige un classement de plusieurs joueurs.','Check whether the game supports duels or needs multiplayer rankings.','Controleer of het spel duels of een rangschikking met meerdere spelers vereist.'],
 ]],
 ['esport',['E-sport · fixer le jeu et la version','Esports · set game and version','E-sport · bepaal spel en versie'],[
 ['Précisez jeu, version, plateforme, région et mode de match.','Specify game, version, platform, region and match mode.','Bepaal spel, versie, platform, regio en wedstrijdmodus.'],
 ['Annoncez cartes, sélections interdites, déconnexion, pause et reprise.','Announce maps, banned picks, disconnections, pauses and restarts.','Bepaal maps, verboden keuzes, verbindingsverlies, pauzes en herstarts.'],
 ['Précisez score de manche ou manches gagnées ; gardez la même convention partout.','Specify round score or rounds won; use one convention throughout.','Bepaal rondescore of gewonnen rondes; gebruik overal dezelfde afspraak.'],
 ]],
 ['efootball',['Football sur console · réglages communs','Console football · shared settings','Consolevoetbal · gelijke instellingen'],[
 ['Précisez titre et édition, plateforme, durée des mi-temps et vitesse de jeu.','Specify title, edition, platform, half length and game speed.','Bepaal titel, editie, platform, helftduur en spelsnelheid.'],
 ['Annoncez équipes autorisées, effectifs, commandes assistées et règles de déconnexion.','Announce permitted teams, squads, assists and disconnection rules.','Bepaal toegestane teams, selecties, hulpinstellingen en regels bij verbindingsverlies.'],
 ['Choisissez prolongations et tirs au but si un vainqueur est requis.','Choose extra time and penalties when a winner is required.','Kies verlenging en strafschoppen wanneer een winnaar nodig is.'],
 ]],
 ['ebasket',['Basket sur console · réglages communs','Console basketball · shared settings','Consolebasketbal · gelijke instellingen'],[
 ['Précisez titre et édition, plateforme, durée des quarts-temps et difficulté.','Specify title, edition, platform, quarter length and difficulty.','Bepaal titel, editie, platform, kwartduur en moeilijkheid.'],
 ['Annoncez équipes, effectifs, aides, pauses et traitement des déconnexions.','Announce teams, rosters, assists, pauses and disconnection handling.','Bepaal teams, selecties, hulpmiddelen, pauzes en afhandeling van verbindingsverlies.'],
 ['Reportez le score final validé, après prolongation si le règlement l’exige.','Enter the validated final score, after overtime if required.','Voer de goedgekeurde eindscore in, na verlenging als dat vereist is.'],
 ]],
 ['multisport',['Multisport · une règle par épreuve','Multisport · rules for each event','Multisport · regels per onderdeel'],[
 ['Définissez chaque épreuve, son matériel, sa durée et son barème.','Define each event, equipment, duration and scoring.','Bepaal per onderdeel materiaal, duur en puntentelling.'],
 ['Des secondes, des mètres et des buts ne s’additionnent pas directement.','Seconds, metres and goals cannot be added directly.','Seconden, meters en doelpunten kun je niet rechtstreeks optellen.'],
 ['Pour un total entre disciplines, choisissez une conversion en points de place, comme dans les Olympiades.','For overall scoring, use ranking-point conversion, as in Olympiads.','Gebruik voor een totaal plaatsingspunten, zoals bij Olympiades.'],
 ]],
 ['autre',['Autre activité · règles à annoncer','Other activity · announce the rules','Andere activiteit · kondig de regels aan'],[
 ['Précisez participants, équipes, matériel et zone de jeu.','Specify participants, teams, equipment and playing area.','Bepaal deelnemers, teams, materiaal en speelruimte.'],
 ['Annoncez durée, comptage, fautes et conditions de victoire.','Announce duration, scoring, fouls and winning conditions.','Bepaal speelduur, puntentelling, overtredingen en winstvoorwaarden.'],
 ['Choisissez comment traiter égalités, abandons et résultats contestés.','Choose how to handle ties, withdrawals and disputed results.','Bepaal hoe gelijke standen, opgaven en betwiste resultaten worden behandeld.'],
 ]],
];
for(const[code,titre,lignes]of cadres)f(code,titre,lignes,[],'cadre');
// Extra UI labels share the same static FR/EN/NL catalogue as the game summaries.
for(const[fr,en,nl]of [
 ['Règles à définir pour votre activité','Rules to define for your activity','Regels vastleggen voor je activiteit'],
 ['Variante à préciser avant de jouer','Choose the variant before playing','Kies de variant vóór het spelen'],
 ['Fiche pratique du jeu','Practical game guide','Praktische spelgids'],
 ['Synthèse pratique : les cas particuliers restent dans le règlement de référence.','Practical summary: special cases remain in the reference rules.','Praktische samenvatting: bijzondere gevallen staan in het referentiereglement.'],
 ['Cette catégorie couvre plusieurs jeux. Utilisez la notice de votre édition et annoncez vos choix.','This category covers several games. Use your edition’s rulebook and announce your choices.','Deze categorie omvat meerdere spellen. Gebruik de regels van jouw editie en kondig je keuzes aan.'],
 ['Fiche revue le {0}','Guide reviewed on {0}','Gids nagekeken op {0}'],
 ['Préparer votre animation','Prepare your event','Bereid je activiteit voor'],
 ['Règles des sports et jeux','Sports and game rules','Sport- en spelregels'],
 ['{0} sports et activités : trouvez les repères du jeu et les variantes à annoncer.','{0} sports and activities: find game basics and variants to announce.','{0} sporten en activiteiten: vind basisregels en varianten om aan te kondigen.'],
 ['Les fiches expliquent le jeu. Elles ne signifient pas que Tourneo arbitre automatiquement toutes les fautes ou calcule chaque décompte spécialisé.','The guides explain the game. They do not mean Tourneo automatically adjudicates every foul or calculates every specialized score.','De gidsen leggen het spel uit. Tourneo beoordeelt daarmee niet automatisch elke overtreding en berekent niet elke bijzondere puntentelling.'],
 ['Choisir un sport ou un jeu','Choose a sport or game','Kies een sport of spel'],
 ['Rechercher un sport ou un jeu','Search for a sport or game','Zoek een sport of spel'],
 ['{0} résultat(s)','{0} result(s)','{0} resultaat/resultaten'],
 ['Règles des jeux','Game rules','Spelregels'],
 ['Recherchez un sport puis sélectionnez sa fiche. Les variantes et les règles à préciser sont signalées. Les noms des références se trouvent à la fin de la fiche.','Search for a sport and select its guide. Variants and rules to specify are flagged. Reference names are listed at the end.','Zoek een sport en selecteer de gids. Varianten en nog te bepalen regels worden aangegeven. Referenties staan onderaan.'],
]as Texte[])traductionsRegles[fr]={en,nl};
