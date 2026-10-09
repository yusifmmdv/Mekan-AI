import { db } from "./db";
import { assert } from "./errors";
export async function requestOrder(
  userId: string,
  key: string,
  contact: string,
  note?: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${userId} FOR UPDATE`;
    const existing = await tx.order.findMany({
      where: { idempotencyKey: { startsWith: `${userId}_${key}_` }, userId },
    });
    if (existing.length) return existing;
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: { include: { store: true } } } },
      },
    });
    assert(cart?.items.length, 400, "EMPTY_CART", "Səbət boşdur.");
    const groups = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      assert(
        item.product.status === "ACTIVE" &&
          item.product.store.approval === "APPROVED",
        409,
        "PRODUCT_UNAVAILABLE",
        "Məhsul artıq satışda deyil.",
      );
      assert(
        item.quantity <= item.product.stock,
        409,
        "STOCK",
        "İstənilən miqdar stokda yoxdur.",
      );
      groups.set(item.product.storeId, [
        ...(groups.get(item.product.storeId) || []),
        item,
      ]);
    }
    const orders = [];
    for (const [storeId, items] of groups) {
      const total =
        items.reduce(
          (sum, i) =>
            sum +
            Math.round(
              Number(i.product.discountPrice || i.product.price) * 100,
            ) *
              i.quantity,
          0,
        ) / 100;
      const order = await tx.order.create({
        data: {
          userId,
          storeId,
          total,
          contact,
          note,
          idempotencyKey: `${userId}_${key}_${storeId}`,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.product.discountPrice || i.product.price,
              productName: i.product.name,
            })),
          },
        },
      });
      orders.push(order);
      await tx.analyticsEvent.createMany({
        data: items.map((i) => ({
          productId: i.productId,
          kind: "ORDER_REQUEST",
          metadata: { orderId: order.id, quantity: i.quantity },
        })),
      });
      const store = await tx.store.findUniqueOrThrow({
        where: { id: storeId },
      });
      await tx.notification.create({
        data: {
          userId: store.ownerId,
          title: "Yeni sifariş sorğusu",
          body: order.id,
        },
      });
    }
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return orders;
  });
}
export async function updateOrder(
  ownerId: string,
  orderId: string,
  status: "NEW" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: { id: orderId, store: { ownerId } },
      include: { items: true },
    });
    assert(order, 404, "ORDER", "Sifariş tapılmadı.");
    assert(
      order.status !== "COMPLETED" && order.status !== "CANCELLED",
      409,
      "FINAL_STATUS",
      "Yekun status dəyişdirilə bilməz.",
    );
    if (status === "COMPLETED") {
      for (const i of order.items) {
        const r = await tx.product.updateMany({
          where: { id: i.productId, stock: { gte: i.quantity } },
          data: { stock: { decrement: i.quantity } },
        });
        assert(
          r.count === 1,
          409,
          "STOCK",
          "Sifarişi tamamlamaq üçün stok kifayət etmir.",
        );
        await tx.analyticsEvent.create({
          data: {
            productId: i.productId,
            kind: "RECORDED_SALE",
            metadata: {
              orderId: order.id,
              quantity: i.quantity,
              amount: Number(i.unitPrice) * i.quantity,
            },
          },
        });
      }
    }
    return tx.order.update({ where: { id: order.id }, data: { status } });
  });
}
