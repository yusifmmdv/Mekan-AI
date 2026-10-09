import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "./db";
import { readAsset } from "./storage";
import { furnitureSchema, matchFurniture } from "./furniture";
import { z } from "zod";

export function detectFurniture(bytes: Buffer) {
  return new Promise<z.infer<typeof furnitureSchema>[]>((resolve, reject) => {
    const installed = path.resolve(process.platform === "win32" ? ".local-ai/venv/Scripts/python.exe" : ".local-ai/venv/bin/python");
    const python = process.env.DETECTOR_PYTHON || (existsSync(installed) ? installed : "python3");
    const child = spawn(python, [path.resolve("local_ai/detect.py")], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("DETECTOR_TIMEOUT")); }, 180_000);
    child.stdout.on("data", chunk => {
      output += chunk;
      if (output.length > 1_000_000) { child.kill("SIGKILL"); reject(new Error("DETECTOR_OUTPUT_LIMIT")); }
    });
    child.stderr.on("data", () => {});
    child.stdin.on("error", () => {});
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error("DETECTOR_NOT_READY"));
      try { resolve(z.array(furnitureSchema).max(30).parse(JSON.parse(output))); }
      catch { reject(new Error("DETECTOR_INVALID_OUTPUT")); }
    });
    child.stdin.end(JSON.stringify({ image: bytes.toString("base64") }));
  });
}

export async function processNextAnalysis() {
  await db.designGeneration.updateMany({
    where: { analysisStatus: "PROCESSING", analysisLockedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    data: { analysisStatus: "FAILED", analysisLockedAt: null, analysisError: "Mebel analizi kəsildi. Yenidən yoxlayın." },
  });
  const rows = await db.$queryRaw<{ id: string }[]>`UPDATE "DesignGeneration" SET "analysisStatus"='PROCESSING', "analysisLockedAt"=NOW() WHERE "id"=(SELECT "id" FROM "DesignGeneration" WHERE "status"='SUCCEEDED' AND "outputImageId" IS NOT NULL AND "analysisStatus"='QUEUED' ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING "id"`;
  if (!rows[0]) return false;
  const g = await db.designGeneration.findUniqueOrThrow({ where: { id: rows[0].id }, include: { outputImage: true, project: true } });
  try {
    const objects = await detectFurniture(await readAsset(g.outputImage!.key));
    const products = await db.product.findMany({ where: { status: "ACTIVE", stock: { gt: 0 }, store: { approval: "APPROVED", owner: { disabled: false } }, roomTypes: { has: g.project.roomType } }, include: { category: true } });
    const matched = matchFurniture(objects, products, { ...g.project, budget: Number(g.project.budget) });
    await db.designGeneration.updateMany({ where: { id: g.id, analysisStatus: "PROCESSING" }, data: { analysisStatus: "SUCCEEDED", analysisError: null, analysisLockedAt: null, analysis: matched } });
  } catch {
    await db.designGeneration.updateMany({ where: { id: g.id, analysisStatus: "PROCESSING" }, data: { analysisStatus: "FAILED", analysisLockedAt: null, analysisError: "Mebel analizi hazır deyil. AI şəkli saxlanılıb. Administrator mebel analizini quraşdırdıqdan sonra yenidən yoxlayın." } });
  }
  return true;
}
