import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { db } from "./db";
import { assert, AppError } from "./errors";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export async function validateImage(bytes: Buffer, mime: string) {
  assert(
    bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES,
    400,
    "FILE_SIZE",
    "Şəkil ən çox 10 MB ola bilər.",
  );
  assert(
    ["image/jpeg", "image/png", "image/webp"].includes(mime),
    400,
    "FILE_TYPE",
    "JPEG, PNG və ya WebP seçin.",
  );
  let meta: Metadata;
  try {
    meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
  } catch {
    throw new AppError(400, "FILE_CONTENT", "Fayl oxuna bilən şəkil deyil.");
  }
  const formats: Record<string, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  assert(
    meta.format && formats[meta.format] === mime,
    400,
    "FILE_CONTENT",
    "Şəklin məzmunu fayl tipinə uyğun deyil.",
  );
  assert(
    meta.width &&
      meta.height &&
      meta.width >= 64 &&
      meta.height >= 64 &&
      (meta.pages || 1) === 1,
    400,
    "FILE_DIMENSIONS",
    "Statik şəkil ən azı 64×64 piksel olmalıdır.",
  );
  return { width: meta.width, height: meta.height };
}
const s3 = () =>
  new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
const localRoot = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.STORAGE_PATH || ".storage",
  );
function safePath(key: string) {
  assert(
    /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.webp$/.test(key),
    400,
    "KEY",
    "Yanlış fayl açarı.",
  );
  return path.join(/* turbopackIgnore: true */ localRoot(), key);
}
export async function readAsset(key: string) {
  if (process.env.STORAGE_DRIVER === "s3") {
    const r = await s3().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    assert(r.Body, 404, "IMAGE", "Şəkil tapılmadı.");
    return Buffer.from(await r.Body.transformToByteArray());
  }
  return readFile(/* turbopackIgnore: true */ safePath(key));
}
export async function deleteObject(key: string) {
  if (process.env.STORAGE_DRIVER === "s3")
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  else await unlink(safePath(key)).catch(() => {});
}
export async function storeImage(
  ownerId: string,
  bytes: Buffer,
  mime: string,
  purpose: string,
) {
  await validateImage(bytes, mime);
  const normalized = await sharp(bytes, { limitInputPixels: 40000000 })
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90 })
    .toBuffer();
  const meta = await sharp(normalized).metadata();
  const key = `${ownerId}/${randomUUID()}.webp`;
  if (process.env.STORAGE_DRIVER === "s3")
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: normalized,
        ContentType: "image/webp",
      }),
    );
  else {
    const file = safePath(key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, normalized, { mode: 0o600 });
  }
  try {
    return await db.imageAsset.create({
      data: {
        ownerId,
        key,
        mime: "image/webp",
        size: normalized.length,
        width: meta.width!,
        height: meta.height!,
        purpose,
      },
    });
  } catch (e) {
    await deleteObject(key);
    throw e;
  }
}
