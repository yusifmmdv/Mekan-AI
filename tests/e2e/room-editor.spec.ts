import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import { unlink } from "node:fs/promises";
import path from "node:path";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const origin = new URL(process.env.APP_URL || "http://127.0.0.1:3000").origin;
const emails: string[] = [];
test.afterAll(async () => {
  for (const email of emails) {
    const user = (
      await pool.query('SELECT id FROM "User" WHERE email=$1', [email])
    ).rows[0];
    if (!user) continue;
    const assets = (
      await pool.query('SELECT key FROM "ImageAsset" WHERE "ownerId"=$1', [
        user.id,
      ])
    ).rows;
    await pool.query('DELETE FROM "RoomDesign" WHERE "userId"=$1', [user.id]);
    await pool.query('DELETE FROM "ImageAsset" WHERE "ownerId"=$1', [user.id]);
    for (const a of assets)
      await unlink(
        path.resolve(process.env.STORAGE_PATH || ".storage", a.key),
      ).catch(() => {});
    await pool.query('DELETE FROM "CreditWallet" WHERE "userId"=$1', [user.id]);
    await pool.query('DELETE FROM "User" WHERE id=$1', [user.id]);
  }
  await pool.end();
});
test("room overlays edit, undo/redo, save/reload, catalog links and private ownership", async ({
  page,
  browser,
}) => {
  const forbiddenRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname === "api.openai.com" ||
      url.pathname === "/api/generations"
    )
      forbiddenRequests.push(url.origin + url.pathname);
  });
  const email = `editor_${randomUUID()}@example.test`;
  emails.push(email);
  const register = await page.request.post("/api/auth/register", {
    headers: { origin },
    data: {
      name: "QA Room Editor",
      email,
      password: `QA_${randomUUID()}!`,
      role: "CUSTOMER",
    },
  });
  expect(register.status()).toBe(200);
  const png = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#ddd8cb" },
  })
    .png()
    .toBuffer();
  const uploaded = await page.request.post("/api/uploads", {
    headers: { origin },
    multipart: {
      purpose: "ROOM",
      file: { name: "private-room.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(uploaded.status()).toBe(200);
  const image = (await uploaded.json()).data;
  const created = await page.request.post("/api/room-editor", {
    headers: { origin },
    data: {
      title: "QA editable room",
      backgroundImageId: image.id,
      scene: { width: 1000, height: 750, layers: [] },
    },
  });
  expect(created.status()).toBe(200);
  const design = (await created.json()).data;
  await page.goto(`/room-editor?id=${design.id}`);
  await expect(page.getByTestId("room-editor-canvas")).toBeVisible();
  await page.getByRole("tab", { name: "Demo formalar", exact: true }).click();
  await page.getByRole("button", { name: "Demo: Divan", exact: true }).click();
  const x = page.getByLabel("X mövqeyi", { exact: true });
  await expect(x).toBeVisible();
  await page.waitForLoadState("networkidle");
  const canvas = page.getByTestId("room-editor-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).toBeTruthy();
  const scale = bounds!.width / 1000;
  await page.mouse.click(bounds!.x + 15, bounds!.y + 15);
  await expect(x).not.toBeVisible();
  await page.mouse.move(bounds!.x + 500 * scale, bounds!.y + 480 * scale);
  await expect(canvas.locator(".konvajs-content")).toHaveCSS("cursor", "grab");
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 540 * scale, bounds!.y + 500 * scale, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(x).toBeVisible();
  expect(Number(await x.inputValue())).toBeGreaterThan(530);
  const original = await x.inputValue();
  await x.fill("250");
  await x.blur();
  await expect(x).toHaveValue("250");
  await page.getByRole("button", { name: "Geri al", exact: true }).click();
  await expect(x).toHaveValue(original);
  await page.getByRole("button", { name: "İrəli al", exact: true }).click();
  await expect(x).toHaveValue("250");
  await page.getByLabel("En", { exact: true }).fill("220");
  await page.getByLabel("Bucaq", { exact: true }).fill("15");
  await page.getByLabel("Bucaq", { exact: true }).blur();
  const savedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/room-editor") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Saxla", exact: true }).click();
  expect((await savedResponse).status()).toBe(200);
  let saved = (
    await (await page.request.get(`/api/room-editor?id=${design.id}`)).json()
  ).data;
  expect(saved.scene.layers).toHaveLength(1);
  expect(saved.scene.layers[0]).toMatchObject({
    assetKey: "sofa",
    x: 250,
    width: 220,
    rotation: 15,
    productId: null,
  });
  await page.reload();
  await expect(page.getByTestId("room-editor-canvas")).toBeVisible();
  const catalog = (
    await (await page.request.get("/api/room-editor?catalog=1")).json()
  ).data;
  const product = catalog.products.find((p: { stock: number }) => p.stock > 0);
  expect(product).toBeTruthy();
  await page.getByRole("tab", { name: "Məhsullar", exact: true }).click();
  await page
    .getByRole("button", { name: `Yerləşdir: ${product.name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Saxla", exact: true }).click();
  await expect
    .poll(async () => {
      const d = (
        await (
          await page.request.get(`/api/room-editor?id=${design.id}`)
        ).json()
      ).data;
      return d.scene.layers.length;
    })
    .toBe(2);
  await page
    .getByRole("button", { name: "Səbətə əlavə et", exact: true })
    .click();
  await expect
    .poll(async () => {
      const r = await pool.query(
        'SELECT ci.quantity FROM "CartItem" ci JOIN "Cart" c ON c.id=ci."cartId" JOIN "User" u ON u.id=c."userId" WHERE u.email=$1 AND ci."productId"=$2',
        [email, product.id],
      );
      return r.rows[0]?.quantity || 0;
    })
    .toBe(1);
  saved = (
    await (await page.request.get(`/api/room-editor?id=${design.id}`)).json()
  ).data;
  expect(
    saved.scene.layers.some(
      (layer: { productId: string | null }) => layer.productId === product.id,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/room-editor-desktop.png",
    fullPage: true,
  });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    storageState: await page.context().storageState(),
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto(`/room-editor?id=${design.id}`);
  await expect(mobile.getByTestId("room-editor-canvas")).toBeVisible();
  await mobile
    .getByRole("button", { name: "Qatı seç: Divan 1", exact: true })
    .tap();
  await expect(mobile.getByLabel("X mövqeyi", { exact: true })).toHaveValue(
    "250",
  );
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mobile.screenshot({
    path: "test-results/room-editor-mobile.png",
    fullPage: true,
  });
  await mobileContext.close();
  const stale = await page.request.post("/api/room-editor", {
    headers: { origin },
    data: {
      id: design.id,
      version: design.version,
      title: design.title,
      scene: saved.scene,
    },
  });
  expect(stale.status()).toBe(409);
  const stranger = await browser.newContext();
  const strangerEmail = `editor_stranger_${randomUUID()}@example.test`;
  emails.push(strangerEmail);
  expect(
    (
      await stranger.request.post("/api/auth/register", {
        headers: { origin },
        data: {
          name: "QA Stranger",
          email: strangerEmail,
          password: `QA_${randomUUID()}!`,
          role: "CUSTOMER",
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await stranger.request.get(`/api/room-editor?id=${design.id}`)).status(),
  ).toBe(404);
  expect((await stranger.request.get(`/api/images/${image.id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await stranger.request.post("/api/room-editor", {
        headers: { origin },
        data: {
          id: design.id,
          version: saved.version,
          title: "Illegal",
          scene: saved.scene,
        },
      })
    ).status(),
  ).toBe(404);
  await stranger.close();
  await page.getByRole("button", { name: "Mebeli sil", exact: true }).click();
  await page.getByRole("button", { name: "Saxla", exact: true }).click();
  await expect
    .poll(async () => {
      const d = (
        await (
          await page.request.get(`/api/room-editor?id=${design.id}`)
        ).json()
      ).data;
      return d.scene.layers.length;
    })
    .toBe(1);
  expect(forbiddenRequests).toEqual([]);
});
