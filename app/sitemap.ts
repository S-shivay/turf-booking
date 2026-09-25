import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/book`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site.url}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site.url}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site.url}/cancellation`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site.url}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
