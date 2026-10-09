import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { canAdmin, canManageStore, canReadProject } from "@/lib/permissions";
import { registerSchema, productSchema, idempotency } from "@/lib/validation";
import { validateImage, MAX_IMAGE_BYTES } from "@/lib/storage";
import { hashPassword, checkPassword } from "@/lib/auth";
import { recommendProducts } from "@/lib/recommendations";
import { buildPrompt } from "@/lib/ai";
describe("server security boundaries", () => {
  it("requires the store role AND store ownership", () => {
    expect(canManageStore("STORE_OWNER", "a", "a")).toBe(true);
    expect(canManageStore("STORE_OWNER", "a", "b")).toBe(false);
    expect(canManageStore("CUSTOMER", "a", "a")).toBe(false);
  });
  it("restricts projects and administration", () => {
    expect(canReadProject("a", "b")).toBe(false);
    for (const role of [
      "CUSTOMER",
      "REALTOR",
      "STORE_OWNER",
      "DESIGNER",
    ] as const)
      expect(canAdmin(role)).toBe(false);
    expect(canAdmin("ADMIN")).toBe(true);
  });
  it("cannot register an admin or short password", () => {
    expect(
      registerSchema.safeParse({
        name: "A",
        email: "a@example.com",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "A",
        email: "a@example.com",
        password: "StrongPass1234",
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });
  it("hashes passwords and rejects incorrect credentials", async () => {
    const hash = await hashPassword("StrongPass1234");
    expect(hash).not.toContain("StrongPass");
    expect(await checkPassword("StrongPass1234", hash)).toBe(true);
    expect(await checkPassword("WrongPass1234", hash)).toBe(false);
  });
  it("rejects invalid discounts, stock and unsafe idempotency keys", () => {
    const p = {
      name: "Sofa",
      description: "Description",
      categoryId: "cat",
      price: 100,
      sku: "S1",
      roomTypes: ["Living room"],
      styles: ["Modern"],
      stock: 1,
    };
    expect(productSchema.safeParse({ ...p, discountPrice: 120 }).success).toBe(
      false,
    );
    expect(productSchema.safeParse({ ...p, stock: -1 }).success).toBe(false);
    expect(idempotency.safeParse("../bad-key").success).toBe(false);
  });
});
describe("image content validation", () => {
  it("accepts a decodable static image", async () => {
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#eee" },
    })
      .png()
      .toBuffer();
    expect(await validateImage(bytes, "image/png")).toEqual({
      width: 64,
      height: 64,
    });
  });
  it("rejects spoofed content, MIME mismatch, small and oversized files", async () => {
    await expect(
      validateImage(Buffer.from("<script>x</script>"), "image/png"),
    ).rejects.toThrow();
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#eee" },
    })
      .png()
      .toBuffer();
    await expect(validateImage(bytes, "image/jpeg")).rejects.toThrow();
    await expect(validateImage(bytes, "image/svg+xml")).rejects.toThrow();
    await expect(
      validateImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png"),
    ).rejects.toThrow();
    const tiny = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#eee" },
    })
      .png()
      .toBuffer();
    await expect(validateImage(tiny, "image/png")).rejects.toThrow();
  });
});
it("recommends only in-stock, affordable products fitting room constraints", () => {
  const base = {
    price: 100,
    stock: 1,
    roomTypes: ["Living room"],
    styles: ["Modern"],
    colors: ["beige"],
    width: 100,
    depth: 100,
  };
  const products = [
    { ...base, id: "match" },
    { ...base, id: "too-wide", width: 600 },
    { ...base, id: "sold", stock: 0 },
    { ...base, id: "costly", price: 600 },
  ];
  expect(
    recommendProducts(products, {
      roomType: "Living room",
      style: "Modern",
      colors: ["Beige"],
      budget: 500,
      width: 4,
      length: 5,
    }).map((p) => p.id),
  ).toEqual(["match"]);
});
it("prompts preserve architecture and disclose illustrative furniture", () => {
  const prompt = buildPrompt(
    {
      roomType: "Bedroom",
      style: "Modern",
      width: 4,
      length: 5,
      colors: ["beige"],
      requirements: "bed",
      budget: 1000,
    },
    true,
  );
  expect(prompt).toContain("doors, windows");
  expect(prompt).toContain("virtual real estate staging");
  expect(prompt).toContain("not an exact catalog product");
});

it("keeps staging output dimensions and embeds a visible disclosure", async () => {
  const { labelStagingImage } = await import("@/lib/staging");
  const input = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  const output = await labelStagingImage(input, "image/png");
  const meta = await sharp(output).metadata();
  expect(meta.width).toBe(900);
  expect(meta.height).toBe(600);
  const pixel = await sharp(output)
    .extract({ left: 890, top: 590, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(pixel[0]).toBeLessThan(100); // Disclosure band remains in the downloadable bitmap.
});
