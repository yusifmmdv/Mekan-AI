import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { demoSamples } from "./demo-samples";
import { matchFurniture } from "./furniture";
import { storeImage, deleteObject } from "./storage";
import { assert } from "./errors";

export async function importDemoProject(userId: string, sampleId: string, key: string) {
  const sample = demoSamples.find(s => s.id === sampleId);
  assert(sample, 400, "DEMO_SAMPLE", "Nümunə tapılmadı.");
  const existing = await db.designGeneration.findUnique({ where: { idempotencyKey: key }, include: { project: true } });
  if (existing) { assert(existing.project.userId === userId && existing.metadata && (existing.metadata as Record<string, unknown>).sampleId === sampleId, 409, "IDEMPOTENCY", "Sorğu açarı artıq istifadə olunub."); return existing.project; }
  const created: Awaited<ReturnType<typeof storeImage>>[] = [];
  try {
    const source = await storeImage(userId, await readFile(path.resolve("public/demo/empty-room.png")), "image/png", "ROOM");
    created.push(source);
    const result = await storeImage(userId, await readFile(path.resolve(`public/demo/${sample.id}.png`)), "image/png", "GENERATION");
    created.push(result);
    const products = await db.product.findMany({ where: { status: "ACTIVE", stock: { gt: 0 }, store: { approval: "APPROVED", owner: { disabled: false } } }, include: { category: true } });
    const objects = matchFurniture(sample.objects.map(o => ({ ...o, productIds: [] })), products, { roomType: sample.roomType, style: sample.style, colors: ["Bej", "İvori"], budget: 6000 });
    return await db.designProject.create({ data: {
      userId, title: `${sample.title} · Hazır nümunə`, imageId: source.id, spaceType: sample.spaceType, roomType: sample.roomType, style: sample.style, width: 4, length: 5, colors: ["Bej", "İvori"], budget: 6000,
      requirements: `${sample.description} Hazır AI nümunəsi əsasında dizayn və icra üçün təklif istəyirəm.`,
      generations: { create: { status: "SUCCEEDED", idempotencyKey: key, outputImageId: result.id, provider: "demo", model: "builtin-imagegen", prompt: "Saved illustration: see docs/DEMO_ASSETS.md for creation prompts.", credits: 0, actualCostAzn: 0, analysisStatus: "SUCCEEDED", analysis: objects, metadata: { sampleId, preparedDemo: true, annotatedBy: "human", source: "builtin-imagegen" } } },
    } });
  } catch (error) {
    for (const asset of created) { await db.imageAsset.delete({ where: { id: asset.id } }); await deleteObject(asset.key); }
    throw error;
  }
}
