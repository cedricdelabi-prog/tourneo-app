import type { Metadata } from 'next';
import Contenu from '@/components/DecouvrirTourneo';

const origineOfficielle = 'https://www.tourneo.org';
const title = 'Tourneo | Organiser un tournoi sportif facilement';
const description = 'Découvrez Tourneo : organisez vos tournois, préparez les rencontres et partagez scores, classements et pronostics avec les joueurs et les spectateurs.';
const estProduction = process.env.VERCEL_ENV === 'production';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: origineOfficielle },
  robots: { index: estProduction, follow: estProduction },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: origineOfficielle,
    siteName: 'Tourneo',
    title,
    description,
    images: [{ url: origineOfficielle + '/tourneo-officiel.png', alt: 'Logo officiel de Tourneo' }],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: [origineOfficielle + '/tourneo-officiel.png'],
  },
};

export default function Page() { return <Contenu />; }
