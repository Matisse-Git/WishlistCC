import { z } from "zod";

const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Must be a 3-letter currency code")
  .transform((s) => s.toUpperCase());

const httpUrlSchema = z.string().refine((val) => {
  try {
    const u = new URL(val);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}, "Must be a valid http(s) URL");

export const prioritySchema = z.enum(["low", "medium", "high"]);
export const statusSchema = z.enum(["wishlist", "bought"]);
export const conversionStatusSchema = z.enum([
  "success",
  "missing_rate",
  "manual",
  "not_needed",
  "unknown",
]);

export const previewRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

// Shared field definitions for item create/update. Optional+nullable fields
// use `null` to mean "clear this field" and `undefined` (omitted) to mean
// "leave unchanged" in PATCH requests.
const itemFields = {
  url: httpUrlSchema.nullable().optional(),
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url("Must be a valid URL").nullable().optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  originalCurrency: currencyCodeSchema.nullable().optional(),
  convertedPrice: z.number().min(0).nullable().optional(),
  baseCurrency: currencyCodeSchema.nullable().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.nullable().optional(),
  store: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  labels: z.array(z.string().trim().min(1)).optional(),
  group: z.string().trim().min(1).max(50).nullable().optional(),
  // Id of another item to become a variant (alternative) of — joins/creates
  // that item's variant set. `null` explicitly detaches from the current set.
  variantOf: z.string().min(1).nullable().optional(),
};

export const itemCreateSchema = z.object({
  ...itemFields,
  status: statusSchema.optional().default("wishlist"),
});

export const itemUpdateSchema = z.object({
  ...itemFields,
  title: itemFields.title.optional(),
});

// A price source needs at least a URL or a store name — an empty one
// (just a price with no idea where it came from) isn't useful to compare.
export const priceSourceCreateSchema = z
  .object({
    url: httpUrlSchema.nullable().optional(),
    store: z.string().trim().max(200).nullable().optional(),
    originalPrice: z.number().min(0).nullable().optional(),
    originalCurrency: currencyCodeSchema.nullable().optional(),
    convertedPrice: z.number().min(0).nullable().optional(),
    baseCurrency: currencyCodeSchema.nullable().optional(),
  })
  .refine((data) => Boolean(data.url) || Boolean(data.store), {
    message: "Enter a URL or a store name",
    path: ["url"],
  });

export const markBoughtSchema = z.object({
  boughtAt: z.coerce.date().optional(),
  boughtPrice: z.number().min(0).nullable().optional(),
  boughtCurrency: currencyCodeSchema.nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const settingsUpdateSchema = z.object({
  baseCurrency: currencyCodeSchema.optional(),
  goalAmount: z.number().min(0).nullable().optional(),
  savedAmount: z.number().min(0).nullable().optional(),
});

export const labelCreateSchema = z.object({
  name: z.string().trim().min(1, "Label name is required").max(50),
  color: z.string().max(20).nullable().optional(),
});

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(50),
  color: z.string().max(20).nullable().optional(),
});

export const itemQuerySchema = z.object({
  status: statusSchema.optional(),
  search: z.string().optional(),
  labels: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : undefined)),
  group: z.string().optional(),
  store: z.string().optional(),
  missingPrice: z.coerce.boolean().optional(),
  priority: prioritySchema.optional(),
  sortBy: z
    .enum(["createdAt", "createdAtAsc", "updatedAt", "priceAsc", "priceDesc", "titleAsc"])
    .optional()
    .default("createdAt"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(60),
});

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
export type PriceSourceCreateInput = z.infer<typeof priceSourceCreateSchema>;
export type MarkBoughtInput = z.infer<typeof markBoughtSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type ItemQueryInput = z.infer<typeof itemQuerySchema>;
