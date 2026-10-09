import { z } from "zod";
import { db } from "./db";
import { assert } from "./errors";
import type { Prisma } from "@/generated/prisma/client";
export const editorAssetKeys = [
  "sofa",
  "table",
  "chair",
  "bed",
  "wardrobe",
  "lamp",
  "decoration",
] as const;
export const editorLayerSchema = z
  .object({
    id: z.uuid(),
    productId: z.string().min(1).max(100).nullable(),
    assetKey: z.enum(editorAssetKeys),
    x: z.number().min(0).max(1000),
    y: z.number().min(0).max(750),
    width: z.number().min(8).max(1000),
    height: z.number().min(8).max(1000),
    rotation: z.number().min(-360).max(360),
  })
  .strict();
export const editorSceneSchema = z
  .object({
    width: z.literal(1000),
    height: z.literal(750),
    layers: z.array(editorLayerSchema).max(100),
  })
  .strict()
  .refine((s) => new Set(s.layers.map((l) => l.id)).size === s.layers.length, {
    message: "Qat ID-ləri unikal olmalıdır.",
  });
export const roomDesignSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    version: z.number().int().positive().optional(),
    title: z.string().trim().min(1).max(180),
    backgroundImageId: z.string().min(1).max(100).optional(),
    backgroundKind: z.enum(["ORIGINAL", "AI"]).optional(),
    scene: editorSceneSchema,
  })
  .strict()
  .refine((v) => !v.id || !!v.version, {
    message: "Yeniləmə üçün versiya tələb olunur.",
  });
export type EditorScene = z.infer<typeof editorSceneSchema>;
const productInclude = {
  store: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: "asc" as const }, take: 1 },
};
type EditorProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
function serializeProduct(p: EditorProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: String(p.price),
    discountPrice: p.discountPrice ? String(p.discountPrice) : null,
    currency: p.currency,
    stock: p.stock,
    demo: p.demo,
    store: p.store,
    category: p.category,
    image: p.images[0]?.assetId
      ? `/api/images/${p.images[0].assetId}`
      : p.images[0]?.url || null,
    width: p.width,
    height: p.height,
    depth: p.depth,
  };
}
export async function editorCatalog({
  page = 1,
  categoryId,
  search,
}: { page?: number; categoryId?: string; search?: string } = {}) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    store: { approval: "APPROVED" },
    ...(categoryId ? { categoryId } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
      skip: (page - 1) * 60,
      take: 60,
    }),
    db.product.count({ where }),
    db.productCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    products: products.map(serializeProduct),
    total,
    page,
    pageSize: 60,
    categories,
  };
}
export async function getRoomDesign(userId: string, id: string) {
  const design = await db.roomDesign.findFirst({ where: { id, userId } });
  assert(design, 404, "DESIGN", "Dizayn tapılmadı.");
  const scene = editorSceneSchema.parse(design.scene);
  const ids = [
    ...new Set(scene.layers.flatMap((l) => (l.productId ? [l.productId] : []))),
  ];
  const products = await db.product.findMany({
    where: {
      id: { in: ids },
      status: "ACTIVE",
      store: { approval: "APPROVED" },
    },
    include: productInclude,
  });
  return {
    ...design,
    scene,
    backgroundUrl: `/api/images/${design.backgroundImageId}`,
    products: products.map(serializeProduct),
  };
}
export async function listRoomDesigns(userId: string, page = 1) {
  const [designs, total] = await Promise.all([
    db.roomDesign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 60,
      take: 60,
      select: {
        id: true,
        title: true,
        backgroundImageId: true,
        backgroundKind: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.roomDesign.count({ where: { userId } }),
  ]);
  return {
    items: designs.map((d) => ({
      ...d,
      backgroundUrl: `/api/images/${d.backgroundImageId}`,
    })),
    total,
    page,
    pageSize: 60,
  };
}
export async function saveRoomDesign(userId: string, input: unknown) {
  const data = roomDesignSchema.parse(input);
  const result = await db.$transaction(async (tx) => {
    const existing = data.id
      ? await tx.roomDesign.findFirst({ where: { id: data.id, userId } })
      : null;
    if (data.id) assert(existing, 404, "DESIGN", "Dizayn tapılmadı.");
    const backgroundImageId =
      data.backgroundImageId || existing?.backgroundImageId;
    assert(backgroundImageId, 400, "BACKGROUND", "Fon şəkli tələb olunur.");
    const asset = await tx.imageAsset.findFirst({
      where: {
        id: backgroundImageId,
        ownerId: userId,
        purpose: { in: ["GENERATION", "ROOM", "PROPERTY"] },
      },
    });
    assert(
      asset,
      403,
      "BACKGROUND",
      "Fon şəklinə giriş yoxdur və ya şəkil növü uyğun deyil.",
    );
    const backgroundKind = asset.purpose === "GENERATION" ? "AI" : "ORIGINAL";
    assert(
      !data.backgroundKind || data.backgroundKind === backgroundKind,
      400,
      "BACKGROUND_KIND",
      "Fon növü şəkil növünə uyğun deyil.",
    );
    const ids = [
      ...new Set(
        data.scene.layers.flatMap((l) => (l.productId ? [l.productId] : [])),
      ),
    ];
    assert(
      (await tx.product.count({
        where: {
          id: { in: ids },
          status: "ACTIVE",
          store: { approval: "APPROVED" },
        },
      })) === ids.length,
      400,
      "PRODUCT",
      "Məhsullardan biri artıq əlçatan deyil. Məhsul əlaqəsini silib yenidən saxlayın.",
    );
    const { id, version } = data;
    const values = {
      title: data.title,
      scene: data.scene,
      backgroundImageId,
      backgroundKind,
    };
    if (!id) return tx.roomDesign.create({ data: { ...values, userId } });
    const changed = await tx.roomDesign.updateMany({
      where: { id, userId, version },
      data: { ...values, version: { increment: 1 } },
    });
    assert(
      changed.count,
      409,
      "VERSION_CONFLICT",
      "Dizayn başqa pəncərədə dəyişdirilib. Son versiyanı açıb yenidən cəhd edin.",
    );
    return tx.roomDesign.findUniqueOrThrow({ where: { id } });
  });
  return getRoomDesign(userId, result.id);
}
