import type { Metadata } from 'next';
import Contenu from './page-content';

export const metadata: Metadata = {
  title: "Organiser un tournoi de tennis de table ou ping-pong | Tourneo",
  description: "Préparez un tournoi de ping-pong à 8, 12 ou 16 joueurs : poules, matchs, tables, durée et classement.",
  alternates: { canonical: 'https://www.tourneo.org/guides/tournoi-tennis-table' },
};

export default function Page() { return <Contenu />; }
