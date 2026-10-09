import { z } from "zod";

export const furnitureLabels: Record<string, string> = {
  sofa: "Divan", chair: "Kreslo / stul", table: "Masa", bed: "Yataq", storage: "Dolab / rəf", lighting: "İşıqlandırma",
};
export const furnitureSchema = z.object({
  id: z.string().max(100),
  category: z.enum(["sofa", "chair", "table", "bed", "storage", "lighting"]),
  label: z.string().max(100),
  score: z.number().min(0).max(1),
  box: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
    .refine(([x, y, w, h]) => w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001, "Invalid furniture bounds"),
  productIds: z.array(z.string().max(100)).max(6).default([]),
});
export type FurnitureObject = z.infer<typeof furnitureSchema>;
export function parseFurniture(value: unknown): FurnitureObject[] {
  const parsed = z.array(furnitureSchema).max(30).safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function categoryForProduct(slug: string): string {
  return ({ sofas: "sofa", chairs: "chair", tables: "table", beds: "bed", storage: "storage", lighting: "lighting" } as Record<string, string>)[slug] || "";
}
type Candidate = { id: string; category: { slug: string }; stock: number; price: unknown; discountPrice?: unknown; styles: string[]; colors: string[]; roomTypes: string[] };
export function matchFurniture<T extends Candidate>(objects: FurnitureObject[], products: T[], prefs: { roomType: string; style: string; colors: string[]; budget: number }): FurnitureObject[] {
  return objects.map(object => ({ ...object, label: furnitureLabels[object.category], productIds: products
    .filter(p => p.stock > 0 && categoryForProduct(p.category.slug) === object.category && p.roomTypes.includes(prefs.roomType) && Number(p.discountPrice ?? p.price) <= prefs.budget)
    .map(p => ({ p, score: (p.styles.includes(prefs.style) ? 5 : 0) + p.colors.filter(c => prefs.colors.some(v => v.toLowerCase() === c.toLowerCase())).length * 2 }))
    .sort((a, b) => b.score - a.score || Number(a.p.discountPrice ?? a.p.price) - Number(b.p.discountPrice ?? b.p.price))
    .slice(0, 3).map(({ p }) => p.id) }));
}
