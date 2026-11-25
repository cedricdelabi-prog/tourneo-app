import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const estProduction = process.env.VERCEL_ENV === 'production';
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
