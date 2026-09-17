import { z } from "zod";

/** Public category DTO — GET /categories */
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  parentId: z.uuid().nullable(),
});

export type CategoryDto = z.infer<typeof categorySchema>;
