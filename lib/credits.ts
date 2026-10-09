import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { assert } from "./errors";
export async function adjustCredits(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  key: string,
  reason: string,
  generationId?: string,
) {
  const existing = await tx.creditTransaction.findUnique({
    where: { idempotencyKey: key },
    include: { wallet: true },
  });
  if (existing) {
    assert(
      existing.wallet.userId === userId && existing.amount === amount,
      409,
      "IDEMPOTENCY",
      "Sorğu açarı artıq istifadə olunub.",
    );
    return existing;
  }
  const wallet = await tx.creditWallet.findUnique({ where: { userId } });
  assert(wallet, 400, "WALLET", "Kredit hesabı tapılmadı.");
  const changed = await tx.creditWallet.updateMany({
    where: {
      id: wallet.id,
      ...(amount < 0 ? { balance: { gte: -amount } } : {}),
    },
    data: { balance: { increment: amount } },
  });
  assert(changed.count === 1, 402, "CREDITS", "Kifayət qədər kredit yoxdur.");
  return tx.creditTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      idempotencyKey: key,
      reason,
      generationId,
    },
  });
}
export const creditBalance = (userId: string) =>
  db.creditWallet.findUnique({ where: { userId } });
