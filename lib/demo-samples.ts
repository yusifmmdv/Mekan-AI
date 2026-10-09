import type { FurnitureObject } from "./furniture";

export const demoCatalog = [
  { id: "demo-product-1", slug: "demo-product-1", name: "Luna modul divan", category: "sofa", price: 1890, stock: 8, demo: true, image: "/editor-assets/sofa.svg", store: { name: "Forma Studio · Demo", slug: "demo-forma" } },
  { id: "demo-product-2", slug: "demo-product-2", name: "Forma istirahət kreslosu", category: "chair", price: 640, stock: 8, demo: true, image: "/editor-assets/chair.svg", store: { name: "Forma Studio · Demo", slug: "demo-forma" } },
  { id: "demo-product-3", slug: "demo-product-3", name: "Terra palıd masa", category: "table", price: 420, stock: 8, demo: true, image: "/editor-assets/table.svg", store: { name: "Forma Studio · Demo", slug: "demo-forma" } },
  { id: "demo-product-4", slug: "demo-product-4", name: "Arc döşəmə lampası", category: "lighting", price: 185, stock: 8, demo: true, image: "/editor-assets/lamp.svg", store: { name: "Forma Studio · Demo", slug: "demo-forma" } },
  { id: "demo-product-6", slug: "demo-product-6", name: "Noma saxlama dolabı", category: "storage", price: 790, stock: 8, demo: true, image: "/editor-assets/wardrobe.svg", store: { name: "Forma Studio · Demo", slug: "demo-forma" } },
] as const;
export type DemoSample = { id: "home" | "office" | "studio"; title: string; spaceType: string; roomType: string; style: string; description: string; objects: FurnitureObject[] };
const item = (id: string, category: FurnitureObject["category"], box: FurnitureObject["box"]): FurnitureObject => ({ id, category, label: category, score: 1, box, productIds: demoCatalog.filter(p => p.category === category).map(p => p.id) });
// These sample regions are manually inspected annotations, not detector output.
export const demoSamples: DemoSample[] = [
  { id: "home", title: "İsti Skandinaviya evi", spaceType: "HOME", roomType: "Living room", style: "Scandinavian", description: "Təbii palıd, yumşaq teksturalar və isti tonlarla rahat qonaq otağı.", objects: [item("home-sofa", "sofa", [0.28, 0.46, 0.47, 0.21]), item("home-table", "table", [0.345, 0.62, 0.315, 0.14]), item("home-chair", "chair", [0.762, 0.52, 0.238, 0.37]), item("home-lamp", "lighting", [0.716, 0.325, 0.065, 0.315])] },
  { id: "office", title: "Fokus üçün modern ofis", spaceType: "OFFICE", roomType: "Office", style: "Modern", description: "İş masası, görüş sahəsi və açıq rəflərlə funksional iş məkanı.", objects: [item("office-desk", "table", [0.345, 0.505, 0.322, 0.19]), item("office-chair", "chair", [0.475, 0.4, 0.085, 0.265]), item("office-shelf", "storage", [0.66, 0.255, 0.13, 0.355]), item("office-meeting", "table", [0, 0.568, 0.267, 0.316]), item("office-guest", "chair", [0.166, 0.548, 0.14, 0.25])] },
  { id: "studio", title: "Yaradıcı dizayn studiyası", spaceType: "STUDIO", roomType: "Office", style: "Contemporary", description: "Yaradıcılıq və komanda işi üçün iş sahəsi, rahat oturma və saxlama həlləri.", objects: [item("studio-desk", "table", [0.23, 0.53, 0.615, 0.30]), item("studio-chair-left", "chair", [0.34, 0.586, 0.18, 0.31]), item("studio-chair-right", "chair", [0.57, 0.59, 0.187, 0.315]), item("studio-sofa", "sofa", [0.218, 0.45, 0.25, 0.14]), item("studio-storage", "storage", [0.515, 0.475, 0.288, 0.105]), item("studio-lamp", "lighting", [0.45, 0.334, 0.05, 0.20])] },
];
