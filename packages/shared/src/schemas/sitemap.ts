import { z } from "zod";

/** GET /sitemap-data — slugs + updated_at for the storefront's sitemap.ts */
export const sitemapDataSchema = z.object({
  categories: z.array(z.object({ slug: z.string(), updatedAt: z.iso.datetime() })),
  sellers: z.array(z.object({ slug: z.string(), updatedAt: z.iso.datetime() })),
  products: z.array(
    z.object({
      sellerSlug: z.string(),
      productSlug: z.string(),
      updatedAt: z.iso.datetime(),
    }),
  ),
});

export type SitemapDataDto = z.infer<typeof sitemapDataSchema>;
