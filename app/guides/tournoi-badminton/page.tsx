import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Organiser un tournoi de badminton : matchs, poules et classement | Tourneo',
  description: 'Préparez un tournoi amical de badminton : choix des poules, nombre de matchs, durée et suivi des résultats avec Tourneo.',
  alternates: { canonical: 'https://www.tourneo.org/guides/tournoi-badminton' },
};

export default function Page() {
  return <main style={{ maxWidth: 840, margin: 'auto', padding: '48px 20px', color: 'white', lineHeight: 1.7 }}>
    <Link href="/guides">← Tous les guides</Link>
    <h1>Comment organiser un tournoi de badminton ?</h1>
    <p>Pour un tournoi amical en club, choisissez le simple ou le double, le nombre de terrains et les règles de chaque rencontre avant les inscriptions.</p>
    <h2>Exemple : 16 joueurs en simple</h2>
    <p>Quatre poules de quatre joueurs produisent six matchs par poule, soit 24 rencontres. Si les deux premiers de chaque poule se qualifient, les quarts, demi-finales et finale ajoutent sept matchs, soit 31 rencontres au total.</p>
    <h2>Préparer le planning</h2>
    <p>Avec quatre terrains et des créneaux de 20 minutes, les 24 matchs de poule occupent au minimum six créneaux, soit deux heures. Prévoyez les pauses, les retards et trois créneaux supplémentaires pour les trois tours de la phase finale.</p>
    <h2>Gérer les inscriptions et le classement</h2>
    <p>Annoncez vos règles de score et de départage avant le premier match. Avec Tourneo, ajoutez les joueurs, préparez les rencontres et saisissez les résultats au fil du tournoi.</p>
    <p><Link href="/login?mode=inscription">Créer mon tournoi de badminton</Link> · <Link href="/formats-tournoi">Comparer les formats</Link></p>
  </main>;
}
