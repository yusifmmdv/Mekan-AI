import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { AppError, assert } from "./errors";
import { appUrl } from "./config";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function requireOrigin(request: Request) {
  const origin = request.headers.get("origin");
  assert(
    origin === new URL(appUrl).origin,
    403,
    "ORIGIN",
    "Sorğu mənbəyi təsdiqlənmədi.",
  );
}
export async function rateLimit(key: string, limit = 20, seconds = 60) {
  const expires = new Date(Date.now() + seconds * 1000);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimitBucket" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimitBucket"."expiresAt" < NOW() THEN 1 ELSE "RateLimitBucket"."count"+1 END,"expiresAt"=CASE WHEN "RateLimitBucket"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimitBucket"."expiresAt" END RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError(
      429,
      "RATE_LIMIT",
      "Çox sayda sorğu. Bir qədər sonra yenidən yoxlayın.",
    );
}
export async function boundedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError(413, "BODY_SIZE", "Sorğu çox böyükdür.");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks);
}
