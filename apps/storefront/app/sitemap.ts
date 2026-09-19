import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = { url: absoluteUrl("/"), priority: 1 };
  const staticPages = [
    { url: absoluteUrl("/sellers"), priority: 0.9 },
    { url: absoluteUrl("/categories"), priority: 0.9 },
    { url: absoluteUrl("/about"), priority: 0.4 },
    { url: absoluteUrl("/contact"), priority: 0.4 },
    { url: absoluteUrl("/terms"), priority: 0.2 },
    { url: absoluteUrl("/privacy"), priority: 0.2 },
    { url: absoluteUrl("/refund-policy"), priority: 0.2 },
  ];

  try {
    const data = await getSitemapData();
    return [
      home,
      ...staticPages,
      ...data.categories.map((c) => ({
        url: absoluteUrl(`/category/${c.slug}`),
        lastModified: c.updatedAt,
        priority: 0.8,
      })),
      ...data.sellers.map((s) => ({
        url: absoluteUrl(`/store/${s.slug}`),
        lastModified: s.updatedAt,
        priority: 0.8,
      })),
      ...data.products.map((p) => ({
        url: absoluteUrl(`/store/${p.sellerSlug}/${p.productSlug}`),
        lastModified: p.updatedAt,
        priority: 0.9,
      })),
    ];
  } catch {
    return [home, ...staticPages];
  }
}
