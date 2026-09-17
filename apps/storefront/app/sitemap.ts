import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = { url: absoluteUrl("/"), priority: 1 };

  try {
    const data = await getSitemapData();
    return [
      home,
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
    return [home];
  }
}
