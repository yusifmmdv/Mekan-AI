import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  editorSceneSchema,
  saveRoomDesign,
  getRoomDesign,
  listRoomDesigns,
  editorCatalog,
} from "@/lib/room-editor";
const run = `editor_${randomUUID()}`;
let owner: string,
  outsider: string,
  room: string,
  ai: string,
  design: string,
  product: string,
  store: string,
  category: string;
const scene = {
  width: 1000 as const,
  height: 750 as const,
  layers: [
    {
      id: randomUUID(),
      productId: null as string | null,
      assetKey: "sofa" as const,
      x: 250,
      y: 300,
      width: 240,
      height: 180,
      rotation: 0,
    },
  ],
};
beforeAll(async () => {
  const users = await Promise.all(
    ["owner", "outsider"].map((name) =>
      db.user.create({
        data: {
          email: `${run}_${name}@example.test`,
          name,
          passwordHash: "integration-only",
        },
      }),
    ),
  );
  [owner, outsider] = users.map((u) => u.id);
  const assets = await Promise.all(
    ["ROOM", "GENERATION"].map((purpose) =>
      db.imageAsset.create({
        data: {
          ownerId: owner,
          key: `${run}_${purpose}`,
          purpose,
          mime: "image/png",
          size: 1,
          width: 1000,
          height: 750,
        },
      }),
    ),
  );
  [room, ai] = assets.map((a) => a.id);
  const c = await db.productCategory.create({
    data: { name: "Editor QA", slug: run },
  });
  category = c.id;
  const s = await db.store.create({
    data: {
      ownerId: outsider,
      name: "Editor QA",
      slug: run,
      description: "QA",
      phone: "QA",
      email: `${run}@example.test`,
      address: "QA",
      approval: "APPROVED",
    },
  });
  store = s.id;
  const p = await db.product.create({
    data: {
      storeId: store,
      categoryId: category,
      name: "Editor sofa",
      slug: run,
      description: "QA",
      price: 155,
      stock: 1,
      sku: run,
      status: "ACTIVE",
      materials: [],
      colors: [],
      tags: [],
      roomTypes: ["Living room"],
      styles: ["Modern"],
    },
  });
  product = p.id;
});
afterAll(async () => {
  await db.roomDesign.deleteMany({
    where: { userId: { in: [owner, outsider] } },
  });
  await db.imageAsset.deleteMany({ where: { ownerId: owner } });
  await db.product.deleteMany({ where: { id: product } });
  await db.store.deleteMany({ where: { id: store } });
  await db.productCategory.deleteMany({ where: { id: category } });
  await db.user.deleteMany({ where: { id: { in: [owner, outsider] } } });
  await db.$disconnect();
});
describe("private room editor", () => {
  it("validates finite bounds and unique layer IDs", () => {
    expect(
      editorSceneSchema.safeParse({
        ...scene,
        layers: [{ ...scene.layers[0], x: Infinity }],
      }).success,
    ).toBe(false);
    expect(
      editorSceneSchema.safeParse({
        ...scene,
        layers: [scene.layers[0], scene.layers[0]],
      }).success,
    ).toBe(false);
    expect(
      editorSceneSchema.safeParse({
        ...scene,
        layers: [{ ...scene.layers[0], assetKey: "../../private" }],
      }).success,
    ).toBe(false);
  });
  it("saves real product overlays separately and returns catalog details", async () => {
    const saved = await saveRoomDesign(owner, {
      title: "QA room",
      backgroundImageId: room,
      scene: { ...scene, layers: [{ ...scene.layers[0], productId: product }] },
    });
    design = saved.id;
    expect(saved.backgroundKind).toBe("ORIGINAL");
    expect(saved.version).toBe(1);
    expect(saved.products[0].price).toBe("155");
    expect(saved.products[0].store.slug).toBe(run);
    expect(
      (await listRoomDesigns(owner)).items.some((i) => i.id === design),
    ).toBe(true);
    expect((await editorCatalog({ categoryId: category })).products[0].id).toBe(
      product,
    );
  });
  it("denies other users reads writes and background reuse", async () => {
    await expect(getRoomDesign(outsider, design)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      saveRoomDesign(outsider, {
        id: design,
        version: 1,
        title: "Intrusion",
        scene,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      saveRoomDesign(outsider, {
        title: "Intrusion",
        backgroundImageId: room,
        scene,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await listRoomDesigns(outsider)).items).toHaveLength(0);
  });
  it("rejects stale simultaneous saves without dropping the winning update", async () => {
    const results = await Promise.allSettled([
      saveRoomDesign(owner, { id: design, version: 1, title: "First", scene }),
      saveRoomDesign(owner, { id: design, version: 1, title: "Second", scene }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "VERSION_CONFLICT" },
    });
    expect((await getRoomDesign(owner, design)).version).toBe(2);
  });
  it("infers AI background and refuses forged kind", async () => {
    const saved = await saveRoomDesign(owner, {
      title: "AI background",
      backgroundImageId: ai,
      scene,
    });
    expect(saved.backgroundKind).toBe("AI");
    await expect(
      saveRoomDesign(owner, {
        title: "Forged",
        backgroundImageId: room,
        backgroundKind: "AI",
        scene,
      }),
    ).rejects.toMatchObject({ code: "BACKGROUND_KIND" });
  });
  it("rejects unavailable product links", async () => {
    await db.product.update({
      where: { id: product },
      data: { status: "ARCHIVED" },
    });
    await expect(
      saveRoomDesign(owner, {
        id: design,
        version: 2,
        title: "Hidden product",
        scene: {
          ...scene,
          layers: [{ ...scene.layers[0], productId: product }],
        },
      }),
    ).rejects.toMatchObject({ code: "PRODUCT" });
    expect(
      (await editorCatalog({ categoryId: category })).products,
    ).toHaveLength(0);
  });
});
