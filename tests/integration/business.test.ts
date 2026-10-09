import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { adjustCredits } from "@/lib/credits";
import {
  enqueueGeneration,
  failGeneration,
  processNext,
} from "@/lib/generations";
import { requestOrder, updateOrder } from "@/lib/marketplace";
import { storeImage, deleteObject } from "@/lib/storage";
const run = `qa_${randomUUID().replaceAll("-", "")}`;
let customer: string,
  owner: string,
  outsider: string,
  product: string,
  store: string,
  category: string,
  project: string,
  asset: string;

beforeAll(async () => {
  const users = await Promise.all(
    ["customer", "owner", "outsider"].map((name, i) =>
      db.user.create({
        data: {
          email: `${run}_${name}@example.test`,
          name: `QA ${name}`,
          passwordHash: "test-only-not-a-login",
          role: i === 1 ? "STORE_OWNER" : "CUSTOMER",
          wallet: { create: { balance: 2 } },
          cart: { create: {} },
        },
      }),
    ),
  );
  [customer, owner, outsider] = users.map((u) => u.id);
  const c = await db.productCategory.create({
    data: { name: "QA", slug: run },
  });
  category = c.id;
  const s = await db.store.create({
    data: {
      ownerId: owner,
      name: "QA isolated store",
      slug: run,
      description: "QA",
      phone: "test",
      email: `${run}@example.test`,
      address: "test",
      approval: "APPROVED",
    },
  });
  store = s.id;
  const p = await db.product.create({
    data: {
      storeId: store,
      categoryId: category,
      name: "QA sofa",
      slug: run,
      description: "QA",
      price: 100,
      discountPrice: 80,
      stock: 3,
      sku: run,
      status: "ACTIVE",
      materials: [],
      colors: ["beige"],
      tags: [],
      roomTypes: ["Living room"],
      styles: ["Modern"],
    },
  });
  product = p.id;
  const image = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#eee" },
  })
    .png()
    .toBuffer();
  const a = await storeImage(customer, image, "image/png", "ROOM");
  asset = a.id;

  const proj = await db.designProject.create({
    data: {
      userId: customer,
      imageId: asset,
      title: "QA room",
      roomType: "Living room",
      style: "Modern",
      width: 4,
      length: 5,
      colors: ["beige"],
      requirements: "Sofa",
      budget: 500,
    },
  });
  project = proj.id;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  const ids = [customer, owner, outsider].filter(Boolean);
  const orders = await db.order.findMany({
    where: { userId: { in: ids } },
    select: { id: true },
  });
  await db.orderItem.deleteMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
  });
  await db.order.deleteMany({ where: { userId: { in: ids } } });
  await db.designGeneration.deleteMany({ where: { projectId: project } });
  await db.designProject.deleteMany({ where: { userId: { in: ids } } });
  const assets = await db.imageAsset.findMany({
    where: { ownerId: { in: ids } },
    select: { key: true },
  });
  await db.imageAsset.deleteMany({ where: { ownerId: { in: ids } } });
  for (const asset of assets) await deleteObject(asset.key);
  await db.analyticsEvent.deleteMany({ where: { productId: product } });
  await db.cartItem.deleteMany({ where: { productId: product } });
  await db.product.deleteMany({ where: { id: product } });
  await db.store.deleteMany({ where: { id: store } });
  await db.productCategory.deleteMany({ where: { id: category } });
  await db.creditTransaction.deleteMany({
    where: { wallet: { userId: { in: ids } } },
  });
  await db.creditWallet.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
describe("PostgreSQL transaction boundaries", () => {
  it("prevents concurrent credit overdraft", async () => {
    await db.creditWallet.update({
      where: { userId: customer },
      data: { balance: 1 },
    });
    const results = await Promise.allSettled(
      [0, 1].map((i) =>
        db.$transaction((tx) =>
          adjustCredits(tx, customer, -1, `${run}_debit_${i}`, "QA"),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
        .balance,
    ).toBe(0);
  });
  it("replays an adjustment without charging twice and rejects key reuse", async () => {
    const key = `${run}_grant`;
    const a = await db.$transaction((tx) =>
      adjustCredits(tx, customer, 2, key, "QA"),
    );
    const b = await db.$transaction((tx) =>
      adjustCredits(tx, customer, 2, key, "QA"),
    );
    expect(a.id).toBe(b.id);
    expect(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
        .balance,
    ).toBe(2);
    await expect(
      db.$transaction((tx) => adjustCredits(tx, outsider, 2, key, "QA")),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY" });
  });
  it("fails honestly without provider config and keeps credits", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("ALLOW_PAID_AI", "false");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      enqueueGeneration(customer, project, `${run}_missing`),
    ).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
        .balance,
    ).toBe(2);
  });
  it("reserves once under duplicate concurrent requests; failed generation refunds once", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "unit-test-no-network");
    vi.stubEnv("ALLOW_PAID_AI", "true"); // Test process only; injected mock never calls a provider.
    vi.stubEnv("PAID_AI_ENABLED", "true");
    const key = `${run}_generation`;
    const [a, b] = await Promise.all([
      enqueueGeneration(customer, project, key),
      enqueueGeneration(customer, project, key),
    ]);
    expect(a.id).toBe(b.id);
    expect(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
        .balance,
    ).toBe(1);
    // Never process another user's queued job in a shared development database.
    const others = await db.designGeneration.count({
      where: { status: "QUEUED", projectId: { not: project } },
    });
    expect(others, "Stop worker test if unrelated jobs are queued").toBe(0);
    const provider = {
      edit: vi
        .fn()
        .mockRejectedValue(new Error("QA intentional provider failure")),
    };
    expect(await processNext(provider)).toBe(true);
    expect(provider.edit).toHaveBeenCalledOnce();
    await failGeneration(a.id, "QA duplicate refund");
    expect(
      (await db.designGeneration.findUniqueOrThrow({ where: { id: a.id } }))
        .status,
    ).toBe("FAILED");
    expect(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
        .balance,
    ).toBe(2);
    expect(
      await db.creditTransaction.count({
        where: { idempotencyKey: `refund_${a.id}` },
      }),
    ).toBe(1);
  });
  it("cannot enqueue another user project", async () => {
    await expect(
      enqueueGeneration(outsider, project, `${run}_foreign`),
    ).rejects.toMatchObject({ code: "PROJECT" });
  });
  it("creates one order request with snapshot prices; only the owner can complete it", async () => {
    const cart = await db.cart.findUniqueOrThrow({
      where: { userId: customer },
    });
    await db.cartItem.create({
      data: { cartId: cart.id, productId: product, quantity: 2 },
    });
    const key = `${run}_order`;
    const [a, b] = await Promise.all([
      requestOrder(customer, key, "qa@example.test"),
      requestOrder(customer, key, "qa@example.test"),
    ]);
    expect(a[0].id).toBe(b[0].id);
    expect(Number(a[0].total)).toBe(160);
    expect(await db.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
    await expect(
      updateOrder(outsider, a[0].id, "COMPLETED"),
    ).rejects.toMatchObject({ code: "ORDER" });
    await updateOrder(owner, a[0].id, "COMPLETED");
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: product } })).stock,
    ).toBe(1);
    await expect(
      updateOrder(owner, a[0].id, "COMPLETED"),
    ).rejects.toMatchObject({ code: "FINAL_STATUS" });
    expect(
      await db.analyticsEvent.count({
        where: { productId: product, kind: "RECORDED_SALE" },
      }),
    ).toBe(1);
  });
  it("rejects insufficient stock and rolls back the order transaction", async () => {
    const cart = await db.cart.findUniqueOrThrow({
      where: { userId: customer },
    });
    await db.cartItem.create({
      data: { cartId: cart.id, productId: product, quantity: 2 },
    });
    await expect(
      requestOrder(customer, `${run}_stock`, "qa@example.test"),
    ).rejects.toMatchObject({ code: "STOCK" });
    expect(await db.order.count({ where: { userId: customer } })).toBe(1);
  });
});

it("local generation succeeds at zero balance without any credit charge or refund ledger", async () => {
  vi.stubEnv("AI_PROVIDER", "local");
  vi.stubEnv("LOCAL_AI_URL", "http://127.0.0.1:7861");
  vi.stubEnv("LOCAL_AI_TOKEN", "qa-loopback-only");
  vi.stubEnv("ALLOW_PAID_AI", "false");
  await db.creditWallet.update({
    where: { userId: customer },
    data: { balance: 0 },
  });
  const before = await db.creditTransaction.count({
    where: { wallet: { userId: customer } },
  });
  const [a, b] = await Promise.all([
    enqueueGeneration(customer, project, `${run}_local`),
    enqueueGeneration(customer, project, `${run}_local`),
  ]);
  expect(a.id).toBe(b.id);
  expect(a.provider).toBe("local");
  expect(a.credits).toBe(0);
  expect(Number(a.estimatedCostAzn)).toBe(0);
  expect(
    await db.designGeneration.count({
      where: { status: "QUEUED", projectId: { not: project } },
    }),
    "No unrelated queue jobs permitted",
  ).toBe(0);
  const bytes = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#eee" },
  })
    .png()
    .toBuffer();
  const provider = {
    edit: vi
      .fn()
      .mockResolvedValue({
        bytes,
        mime: "image/png",
        metadata: { provider: "local", model: "mock-only" },
      }),
  };
  expect(await processNext(provider)).toBe(true);
  const result = await db.designGeneration.findUniqueOrThrow({
    where: { id: a.id },
  });
  expect(result.status).toBe("SUCCEEDED");
  expect(result.outputImageId).toBeTruthy();
  expect(provider.edit).toHaveBeenCalledOnce();
  await failGeneration(a.id, "No refund for successful local job");
  expect(
    (await db.creditWallet.findUniqueOrThrow({ where: { userId: customer } }))
      .balance,
  ).toBe(0);
  expect(
    await db.creditTransaction.count({
      where: { wallet: { userId: customer } },
    }),
  ).toBe(before);
});
