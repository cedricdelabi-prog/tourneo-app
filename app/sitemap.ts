import type { MetadataRoute } from 'next';

const origine = 'https://www.tourneo.org';
const pagesPubliques = ['/', '/guides', '/formats-tournoi', '/aide', '/contact', '/guides/organiser-tournoi', '/guides/nombre-matchs', '/guides/duree-tournoi', '/guides/egalites-classement', '/guides/tournoi-foot', '/guides/tournoi-petanque', '/guides/tournoi-flechettes', '/guides/tournoi-tennis-table', '/guides/tournoi-gaming', '/guides/outils-et-olympiades', '/guides/tournoi-badminton'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV !== 'production') {
    return [];
  }

  return pagesPubliques.map((page, index) => ({
    url: new URL(page, origine).toString(),
    changeFrequency: 'weekly' as const,
    priority: index === 0 ? 1 : 0.6,
  }));
}