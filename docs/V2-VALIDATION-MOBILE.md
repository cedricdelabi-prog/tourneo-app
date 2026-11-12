# Contrôles V2 — 12 novembre 2026

Les tests navigateur ci-dessous utilisent Chromium avec tailles d’écran et interactions tactiles simulées. Ils ne constituent pas un essai de capteur photo physique ni une certification Safari/iOS ou Android.

| Contrôle | Résultat |
|---|---|
| FR, largeur 320 px | Pas de débordement horizontal, tirage de 21 personnes en trois équipes de sept |
| EN, largeur 390 px | Même parcours, libellés et noms de participants vérifiés |
| NL, largeur 768 px | Même parcours et absence d’erreur JavaScript |
| FR, largeur 1366 px | Même parcours sur ordinateur |
| Photo et modification pendant un tournoi | Image préparée en JPEG, nouvelle équipe affichée, score 13–6 et identifiants conservés |
| Historique des membres et du nom | Conservé localement et dans le format de sauvegarde |
| FR/EN/NL | Catalogues statiques, interpolations et valeurs techniques protégées ; aucun nom de joueur envoyé à une API de traduction |
| Android | APK de test compilé et signé par le mécanisme debug Android, paquet `com.cedricdelabi.tourneo.v2`, version `2.0-test.1`, SDK cible 36 |

## Tests réels restant nécessaires

- Photo prise avec le téléphone, refus puis réautorisation de la caméra.
- Safari/iPhone et installation de l’application web sur l’écran d’accueil.
- Installation de l’APK sur Android et actualisation de son WebView.
- Appels entre deux comptes réellement connectés, puis réception d’une alerte avec l’application fermée lorsque le canal est activé.

Les quatre points mobiles et appels déjà codés restent suivis comme « À tester » dans le compteur général jusqu’à ces confirmations. La compilation de l’APK ne signifie pas une publication dans Google Play.

## Traductions

Les traductions statiques ont été préparées hors ligne à partir des textes de l’interface, avec des modèles Argos/OpenNMT. Aucun tournoi, profil ou fichier utilisateur n’a été soumis à un service de traduction. La terminologie essentielle a été corrigée manuellement ; les corrections sont conservées dans `V2-TRADUCTIONS-REVISEES.json`. Une relecture humaine de toutes les descriptions longues reste souhaitable.
