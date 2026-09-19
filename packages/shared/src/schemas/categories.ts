import { z } from "zod";

/** Public category DTO — GET /categories (active only) */
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  parentId: z.uuid().nullable(),
  sortOrder: z.number().int(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

/** Admin view — includes hidden categories and usage counts. */
export const adminCategorySchema = categorySchema.extend({
  isActive: z.boolean(),
  parentName: z.string().nullable(),
  productCount: z.number().int(),
  sellerCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type AdminCategoryDto = z.infer<typeof adminCategorySchema>;

const slugField = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
  .max(100);

/** POST /admin/categories */
export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  slug: slugField.optional(),
  parentId: z.uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** PATCH /admin/categories/:id */
export const updateCategorySchema = createCategorySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "Nothing to update" },
);
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---------- seller "suggest a category" ----------

export const CATEGORY_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type CategoryRequestStatus = (typeof CATEGORY_REQUEST_STATUSES)[number];

export const categoryRequestSchema = z.object({
  id: z.uuid(),
  sellerId: z.uuid(),
  sellerName: z.string().nullable(),
  name: z.string(),
  note: z.string().nullable(),
  status: z.enum(CATEGORY_REQUEST_STATUSES),
  adminNote: z.string().nullable(),
  /** Category created when the request was approved. */
  categoryId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});
export type CategoryRequestDto = z.infer<typeof categoryRequestSchema>;

/** POST /seller/category-requests */
export const createCategoryRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter the category name").max(80),
  note: z.string().trim().max(500).optional(),
});
export type CreateCategoryRequestInput = z.infer<typeof createCategoryRequestSchema>;

/** PATCH /admin/category-requests/:id */
export const reviewCategoryRequestSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  /** On approve: final name (defaults to the requested name) and optional parent. */
  name: z.string().trim().min(2).max(80).optional(),
  parentId: z.uuid().nullable().optional(),
  adminNote: z.string().trim().max(500).optional(),
});
export type ReviewCategoryRequestInput = z.infer<typeof reviewCategoryRequestSchema>;
