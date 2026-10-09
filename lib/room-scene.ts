/** Editable 2D overlays only. Coordinates are canvas units, never real measurements. */
export const ASSET_KEYS = [
  "sofa",
  "table",
  "chair",
  "bed",
  "wardrobe",
  "lamp",
  "decoration",
] as const;
export type AssetKey = (typeof ASSET_KEYS)[number];
export const ASSET_LABELS: Record<AssetKey, string> = {
  sofa: "Divan",
  table: "Masa",
  chair: "Stul",
  bed: "Çarpayı",
  wardrobe: "Dolab",
  lamp: "Lampa",
  decoration: "Dekor",
};
export type FurnitureLayer = {
  id: string;
  productId: string | null;
  assetKey: AssetKey;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
export type RoomScene = { width: 1000; height: 750; layers: FurnitureLayer[] };
export type EditorProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  discountPrice?: string | null;
  stock: number;
  demo: boolean;
  store: { name: string; slug: string };
  category: { name: string; slug: string };
};
export type RoomDocument = {
  id: string;
  title: string;
  backgroundImageId: string;
  backgroundKind: "ORIGINAL" | "AI";
  scene: RoomScene;
  version: number;
  updatedAt: string;
  products: EditorProduct[];
};
export type History = {
  past: RoomScene[];
  present: RoomScene;
  future: RoomScene[];
};
export const emptyScene = (): RoomScene => ({
  width: 1000,
  height: 750,
  layers: [],
});
export const historyFor = (scene: RoomScene): History => ({
  past: [],
  present: scene,
  future: [],
});
export function commitScene(history: History, scene: RoomScene): History {
  if (JSON.stringify(history.present) === JSON.stringify(scene)) return history;
  return {
    past: [...history.past.slice(-49), history.present],
    present: scene,
    future: [],
  };
}
export function undoScene(history: History): History {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redoScene(history: History): History {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
const bounded = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
export function updateLayer(
  scene: RoomScene,
  id: string,
  patch: Partial<
    Pick<
      FurnitureLayer,
      "x" | "y" | "width" | "height" | "rotation" | "assetKey" | "productId"
    >
  >,
): RoomScene {
  return {
    ...scene,
    layers: scene.layers.map((layer) =>
      layer.id !== id
        ? layer
        : {
            ...layer,
            ...patch,
            x: bounded(patch.x ?? layer.x, 0, 1000),
            y: bounded(patch.y ?? layer.y, 0, 750),
            width: bounded(patch.width ?? layer.width, 8, 1000),
            height: bounded(patch.height ?? layer.height, 8, 1000),
            rotation: bounded(patch.rotation ?? layer.rotation, -360, 360),
          },
    ),
  };
}
export function removeLayer(scene: RoomScene, id: string): RoomScene {
  return { ...scene, layers: scene.layers.filter((layer) => layer.id !== id) };
}
export function createLayer(
  assetKey: AssetKey,
  productId: string | null = null,
  position = { x: 500, y: 480 },
): FurnitureLayer {
  return {
    id: crypto.randomUUID(),
    productId,
    assetKey,
    ...position,
    width: 240,
    height: 180,
    rotation: 0,
  };
}
export function assetForProduct(
  product: Pick<EditorProduct, "name" | "category">,
): AssetKey {
  const text =
    `${product.category.slug} ${product.category.name} ${product.name}`.toLowerCase();
  if (/sofa|divan/.test(text)) return "sofa";
  if (/wardrobe|dolab|storage|saxlama/.test(text)) return "wardrobe";
  if (/lamp|lampa|işıq|lighting/.test(text)) return "lamp";
  if (/bed|çarpayı|yataq/.test(text)) return "bed";
  if (/chair|stul|kreslo/.test(text)) return "chair";
  if (/table|masa/.test(text)) return "table";
  return "decoration";
}
