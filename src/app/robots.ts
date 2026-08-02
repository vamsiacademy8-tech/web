import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/test/'], // Prevent crawling of private areas
    },
    sitemap: 'https://www.vamsiacademy.in/sitemap.xml',
  };
}
