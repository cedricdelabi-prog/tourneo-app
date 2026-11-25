import type { Metadata } from 'next';
import Contenu from './page-content';

export const metadata: Metadata = {
  title: "Organiser un tournoi de fléchettes en poules et 501 | Tourneo",
  description: "Préparez un tournoi de fléchettes à 8 ou 16 joueurs : cibles, nombre de matchs, format 501, planning et classement.",
  alternates: { canonical: 'https://www.tourneo.org/guides/tournoi-flechettes' },
};

export default function Page() { return <Contenu />; }
