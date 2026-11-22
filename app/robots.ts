import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const estProduction = process.env.NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED === 'true';
  if (!estProduction) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/administration',
        '/dashboard',
        '/login',
        '/profil',
        '/reset-password',
        '/tournoi/',
        '/inscriptions/',
        '/partage/',
        '/joueur/',
        '/mes-matchs',
        '/messages',
      ],
    },
    sitemap: 'https://www.tourneo.org/sitemap.xml',
  };
}
