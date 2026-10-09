import { db } from "./db";
import { assert } from "./errors";
import { adjustCredits } from "./credits";
import { aiConfigured, freeAi } from "./config";
import { HF_MODEL } from "./huggingface";
import { AppError } from "./errors";
import { buildPrompt, getImageProvider, type ImageProvider } from "./ai";
import { readAsset, storeImage } from "./storage";
import { labelStagingImage } from "./staging";
export async function enqueueGeneration(
  userId: string,
  projectId: string,
  key: string,
) {
  assert(
    aiConfigured(),
    503,
    "AI_NOT_CONFIGURED",
    "AI xidməti konfiqurasiya edilməyib. Layihəni saxlaya bilərsiniz; yerli AI xidmətini konfiqurasiya edin.",
  );
  const local = freeAi();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "CreditWallet" WHERE "userId"=${userId} FOR UPDATE`;
    const existing = await tx.designGeneration.findUnique({
      where: { idempotencyKey: key },
      include: { project: true },
    });
    if (existing) {
      assert(
        existing.project.userId === userId && existing.projectId === projectId,
        409,
        "IDEMPOTENCY",
        "Sorğu açarı artıq istifadə olunub.",
      );
      return existing;
    }
    const p = await tx.designProject.findFirst({
      where: { id: projectId, userId },
      include: { staging: true },
    });
    assert(p, 404, "PROJECT", "Layihə tapılmadı.");
    const active = await tx.designGeneration.count({
      where: { project: { userId }, status: { in: ["QUEUED", "PROCESSING"] } },
    });
    assert(
      active < 3,
      429,
      "QUEUE_LIMIT",
      "Ən çox 3 aktiv generasiya mümkündür.",
    );
    const g = await tx.designGeneration.create({
      data: {
        projectId,
        idempotencyKey: key,
        provider: process.env.AI_PROVIDER!,
        credits: local ? 0 : 1,
        model: process.env.AI_PROVIDER === "huggingface" ? HF_MODEL : local
          ? process.env.LOCAL_AI_MODEL ||
            "stable-diffusion-v1-5/stable-diffusion-v1-5"
          : process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt: buildPrompt(p, !!p.staging),
        estimatedCostAzn: local
          ? 0
          : process.env.AI_COST_ESTIMATE_AZN
            ? Number(process.env.AI_COST_ESTIMATE_AZN)
            : undefined,
      },
    });
    if (!local)
      await adjustCredits(
        tx,
        userId,
        -1,
        `generation_${g.id}`,
        "GENERATION_RESERVED",
        g.id,
      );
    return g;
  });
}
export async function failGeneration(id: string, message: string) {
  return db.$transaction(async (tx) => {
    const rows = await tx.designGeneration.updateMany({
      where: { id, status: { in: ["QUEUED", "PROCESSING"] } },
      data: { status: "FAILED", error: message, lockedAt: null },
    });
    if (!rows.count) return;
    const g = await tx.designGeneration.findUniqueOrThrow({
      where: { id },
      include: { project: true },
    });
    if (g.credits > 0)
      await adjustCredits(
        tx,
        g.project.userId,
        g.credits,
        `refund_${id}`,
        "GENERATION_REFUND",
        id,
      );
  });
}
export async function processNext(provider?: ImageProvider) {
  const expired = await db.designGeneration.findMany({
    where: {
      status: "PROCESSING",
      lockedAt: { lt: new Date(Date.now() - 10 * 60000) },
    },
  });
  // Ambiguous interrupted provider calls are not automatically replayed: avoid duplicate paid calls.
  for (const g of expired)
    await failGeneration(
      g.id,
      g.credits > 0
        ? "İş kəsildi. Kredit geri qaytarıldı; yenidən cəhd edə bilərsiniz."
        : "Yerli AI işi kəsildi. Yenidən cəhd edə bilərsiniz.",
    );
  const ids = await db.$queryRaw<
    { id: string }[]
  >`UPDATE "DesignGeneration" SET "status"='PROCESSING',"lockedAt"=NOW(),"attempts"="attempts"+1,"updatedAt"=NOW() WHERE "id"=(SELECT "id" FROM "DesignGeneration" WHERE "status"='QUEUED' ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING "id"`;
  if (!ids[0]) return false;
  const g = await db.designGeneration.findUniqueOrThrow({
    where: { id: ids[0].id },
    include: { project: { include: { image: true, staging: true } } },
  });
  try {
    const selectedProvider = provider || getImageProvider(g.provider, g.model);
    const input = await readAsset(g.project.image.key);
    let result: Awaited<ReturnType<ImageProvider["edit"]>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await selectedProvider.edit(input, g.prompt, g.model);
        break;
      } catch (e) {
        if (!(e as { retryable?: boolean }).retryable || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        await db.designGeneration.update({
          where: { id: g.id },
          data: { attempts: { increment: 1 } },
        });
      }
    }
    assert(result, 502, "AI_RESULT", "AI nəticəsi alınmadı.");
    const asset = await storeImage(
      g.project.userId,
      g.project.staging
        ? await labelStagingImage(result.bytes, result.mime)
        : result.bytes,
      g.project.staging ? "image/png" : result.mime,
      "GENERATION",
    );
    await db.$transaction(async (tx) => {
      const changed = await tx.designGeneration.updateMany({
        where: { id: g.id, status: "PROCESSING" },
        data: {
          status: "SUCCEEDED",
          outputImageId: asset.id,
          analysisStatus: "QUEUED",
          metadata: JSON.parse(JSON.stringify(result.metadata)),
          ...(["local", "huggingface"].includes(g.provider) ? { actualCostAzn: 0 } : {}),
          lockedAt: null,
        },
      });
      if (changed.count)
        await tx.notification.create({
          data: {
            userId: g.project.userId,
            title: "Dizayn hazırdır",
            body: g.project.title,
          },
        });
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "generation_failed",
        generationId: g.id,
        error: e instanceof Error ? e.message : "UNKNOWN",
      }),
    );
    await failGeneration(
      g.id,
      e instanceof AppError ? e.message : g.credits > 0
        ? "Generasiya alınmadı. Kredit geri qaytarıldı. Yenidən yoxlayın."
        : "AI generasiyası alınmadı. Yenidən yoxlayın və ya hazır nümunələri açın.",
    );
  }
  return true;
}
