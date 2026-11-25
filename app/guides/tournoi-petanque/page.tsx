import type { Metadata } from 'next';
import Contenu from './page-content';

export const metadata: Metadata = {
  title: "Organiser un concours de pétanque à 8 ou 16 équipes | Tourneo",
  description: "Calculez les parties, choisissez doublettes ou triplettes, préparez les poules et suivez le classement de votre concours de pétanque avec Tourneo.",
  alternates: { canonical: 'https://www.tourneo.org/guides/tournoi-petanque' },
};

export default function Page() { return <Contenu />; }
