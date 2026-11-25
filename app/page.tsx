import type { Metadata } from 'next';
import Contenu from '@/components/DecouvrirTourneo';

const origineOfficielle = 'https://www.tourneo.org';
const title = 'Tourneo | Application pour organiser vos tournois sportifs';
const description = 'Organisez vos tournois de pétanque, badminton, fléchettes et autres sports. Gérez les inscriptions, les matchs, les scores et les classements avec Tourneo.';
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
