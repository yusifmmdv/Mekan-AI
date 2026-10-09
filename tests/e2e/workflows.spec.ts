import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
import sharp from "sharp";
import { unlink } from "node:fs/promises";
import path from "node:path";
const email = `e2e_${randomUUID()}@example.test`;
const password = `Qa_${randomUUID()}!`;

test.afterAll(async () => {
  const result = await pool.query('SELECT id FROM "User" WHERE email=$1', [
    email,
  ]);
  const user = result.rows[0];
  if (user) {
    const assets = await pool.query(
      'SELECT key FROM "ImageAsset" WHERE "ownerId"=$1',
      [user.id],
    );
    await pool.query(
      'DELETE FROM "DesignGeneration" WHERE "projectId" IN (SELECT id FROM "DesignProject" WHERE "userId"=$1)',
      [user.id],
    );
    await pool.query('DELETE FROM "DesignProject" WHERE "userId"=$1', [
      user.id,
    ]);
    await pool.query('DELETE FROM "ImageAsset" WHERE "ownerId"=$1', [user.id]);
    for (const asset of assets.rows)
      await unlink(
        path.resolve(process.env.STORAGE_PATH || ".storage", asset.key),
      ).catch(() => {});
    await pool.query(
      'DELETE FROM "CreditTransaction" WHERE "walletId" IN (SELECT id FROM "CreditWallet" WHERE "userId"=$1)',
      [user.id],
    );
    await pool.query('DELETE FROM "CreditWallet" WHERE "userId"=$1', [user.id]);
    await pool.query('DELETE FROM "User" WHERE id=$1', [user.id]);
  }
  await pool.end();
});
test("register, login, catalog/cart, role gates and private room project", async ({
  page,
  browser,
}) => {
  await page.goto("/register");
  await page.getByLabel("Ad və soyad").fill("QA Browser");
  await page.getByLabel("E-poçt", { exact: false }).fill(email);
  await page.getByLabel("Şifrə", { exact: false }).fill(password);
  await page
    .getByLabel("Platformadan necə istifadə edəcəksiniz?")
    .selectOption("CUSTOMER");
  await page.getByRole("button", { name: "Hesab yarat" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-poçt", { exact: false }).fill(email);
  await page.getByLabel("Şifrə", { exact: false }).fill(password);
  await page.getByRole("button", { name: "Daxil ol", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/marketplace");
  await expect(
    page.getByRole("button", { name: "Səbətə əlavə et" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Səbətə əlavə et" }).first().click();
  await expect(page.getByText("Məhsul səbətə əlavə olundu.")).toBeVisible();
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Sifariş sorğusu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ödəniş tutulmur.", { exact: false }),
  ).toBeVisible();
  const origin = new URL(process.env.APP_URL || "http://127.0.0.1:3000").origin;
  const post = (path: string, data: unknown) =>
    page.request.post(`/api/${path}`, { data, headers: { origin } });
  const forbidden = await post("admin", {
    action: "setting",
    targetId: "commissionRate",
    data: { value: 5 },
  });
  expect(forbidden.status()).toBe(403);
  expect(
    (await post("store/archive", { productId: "not-owned" })).status(),
  ).toBe(403);
  const wrongOrigin = await page.request.post("/api/cart", {
    data: { productId: "x", quantity: 1 },
    headers: { origin: "https://malicious.example" },
  });
  expect(wrongOrigin.status()).toBe(403);
  const png = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  const upload = await page.request.post("/api/uploads", {
    multipart: {
      purpose: "ROOM",
      file: { name: "room.png", mimeType: "image/png", buffer: png },
    },
    headers: { origin },
  });
  expect(upload.status()).toBe(200);
  const asset = (await upload.json()).data;
  const projectResponse = await post("projects", {
    title: "QA private room",
    imageId: asset.id,
    roomType: "Living room",
    style: "Modern",
    width: 4,
    length: 5,
    colors: ["beige"],
    requirements: "sofa",
    budget: 1000,
  });
  expect(projectResponse.status()).toBe(200);
  const project = (await projectResponse.json()).data;
  expect((await page.request.get(`/api/images/${asset.id}`)).status()).toBe(
    200,
  );
  expect(
    (
      await page.request.get(`/api/generations?projectId=${project.id}`)
    ).status(),
  ).toBe(200);
  const anonymous = await browser.newContext();
  const stranger = await anonymous.newPage();
  expect((await stranger.request.get(`/api/images/${asset.id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await stranger.request.get(`/api/generations?projectId=${project.id}`)
    ).status(),
  ).toBe(401);
  await stranger.goto("/dashboard");
  await expect(stranger).toHaveURL(/\/login$/);
  await anonymous.close();
  const logout = await post("auth/logout", {});
  expect(logout.status()).toBe(200);
  expect((await page.request.get(`/api/images/${asset.id}`)).status()).toBe(
    404,
  );
});
test("store owner creates and edits a moderated product; cannot edit foreign products", async ({
  page,
}) => {
  test.skip(
    !process.env.SEED_DEMO_PASSWORD,
    "Requires configured demo seed password",
  );
  await page.goto("/login");
  await page
    .getByLabel("E-poçt", { exact: false })
    .fill("store_owner@demo.mekan.test");
  await page
    .getByLabel("Şifrə", { exact: false })
    .fill(process.env.SEED_DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Daxil ol", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const origin = new URL(process.env.APP_URL || "http://127.0.0.1:3000").origin;
  const sku = `QA_${randomUUID()}`;
  const category = (
    await pool.query('SELECT id FROM "ProductCategory" LIMIT 1')
  ).rows[0];
  let productId: string | undefined;
  try {
    const body = {
      name: "QA browser product",
      description: "Isolated QA fixture",
      categoryId: category.id,
      price: 100,
      stock: 2,
      sku,
      roomTypes: ["Living room"],
      styles: ["Modern"],
      imageIds: [],
    };
    const response = await page.request.post("/api/store/products", {
      headers: { origin },
      data: body,
    });
    expect(response.status()).toBe(200);
    const product = (await response.json()).data;
    productId = product.id;
    expect(product.status).toBe("PENDING");
    const edit = await page.request.post("/api/store/products", {
      headers: { origin },
      data: { ...body, id: product.id, price: 120 },
    });
    expect(edit.status()).toBe(200);
    expect(Number((await edit.json()).data.price)).toBe(120);
    const foreign = await page.request.post("/api/store/products", {
      headers: { origin },
      data: { ...body, id: "another-store-product" },
    });
    expect(foreign.status()).toBe(404);
    await page.goto("/dashboard/store");
    await expect(
      page.getByText("QA browser product", { exact: false }).first(),
    ).toBeVisible();
  } finally {
    if (productId) {
      await pool.query('DELETE FROM "ProductImage" WHERE "productId"=$1', [
        productId,
      ]);
      await pool.query('DELETE FROM "Product" WHERE id=$1', [productId]);
    }
  }
});
