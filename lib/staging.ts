import sharp from "sharp";
import { validateImage } from "./storage";
/** Bake the disclosure into downloaded staging images, not only the surrounding UI. */
export async function labelStagingImage(bytes: Buffer, mime: string) {
  const { width, height } = await validateImage(bytes, mime);
  const bar = Math.max(36, Math.round(height * 0.055));
  const font = Math.max(12, Math.round(bar * 0.43));
  const banner = Buffer.from(
    `<svg width="${width}" height="${bar}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#262a25" fill-opacity="0.9"/><text x="${Math.round(bar * 0.45)}" y="${Math.round(bar * 0.67)}" font-family="sans-serif" font-size="${font}" fill="#ffffff">Virtually staged · AI visualization</text></svg>`,
  );
  return sharp(bytes, { limitInputPixels: 40000000 })
    .composite([{ input: banner, gravity: "south" }])
    .png()
    .toBuffer();
}
