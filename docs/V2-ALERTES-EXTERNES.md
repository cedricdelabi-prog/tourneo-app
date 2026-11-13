# Alertes externes — préparation du 13 novembre 2026

Backend développé, tests SQL et transport simulé réussis en local. Migration non appliquée : confirmation technique expirée. Fonction non déployée. Interface d’activation à intégrer à cette sauvegarde.

Canaux séparés et désactivés par défaut. Le worker ne prend que les nouveaux messages avec consentement, vérifie les retraits et la lecture, utilise des baux et des reprises bornées. Push Web uniquement, aucun FCM natif APK. E-mails conditionnés à RESEND_API_KEY et TOURNEO_EMAIL_FROM avec expéditeur vérifié dans les secrets Supabase. Ne pas placer ces secrets dans le dépôt.

Les comptes authentifiés n’accèdent qu’à leurs appareils et états. Clés VAPID et jeton du worker restent privés. La transmission au fournisseur ne prouve pas la réception ou la lecture. Aucune alerte réelle envoyée pendant les tests. Ne pas annoncer 85/85 validés.
