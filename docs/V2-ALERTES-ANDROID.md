# Notifications Android V2

Implémentation du 13 novembre : plugin Capacitor 8.1.3, permission explicite, canal de match, jeton lié à une installation et au compte, rotation du jeton, désactivation et déconnexion, liens internes limités. Compilation Android debug réussie. Aucune notification native envoyée à un vrai téléphone.

L’envoi FCM HTTP v1 utilise un compte de service uniquement dans le worker Supabase. JWT RSA et OAuth sont vérifiés par des transports simulés. Aucun secret côté navigateur ou dans le dépôt.

Pour activer : fournir la configuration Firebase du seul applicationId com.cedricdelabi.tourneo.v2 (android/app/google-services.json, ignoré par git) et configurer FCM_SERVICE_ACCOUNT dans les secrets du worker. Le projet déclaré par le binaire doit correspondre au projet du serveur. Sans configuration, l’activation reste désactivée, sans faux accusé de réception. Ne pas réutiliser les identifiants de la V1.

Migration additive tourneo_v2_alertes_android et mise à jour du worker à appliquer ensemble. Le worker précédent reste compatible avec la nouvelle signature par défaut, mais ne traite pas les envois Android.

Tests locaux : SQL consolidé et migrations, propriétaires, compte modifié, canal désactivé, expiration, retrait du dernier appareil, JWT/OAuth/reprises. Les tests sur vrai Android, Safari/iPhone et caméra physique restent à faire.
