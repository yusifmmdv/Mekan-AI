import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireOrigin, hashToken, rateLimit, newToken } from "@/lib/security";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { productId } = z
      .object({ productId: z.string().max(100) })
      .parse(await request.json());
    const jar = await cookies();
    let token = jar.get("mekan_visitor")?.value;
    if (!token) {
      token = newToken();
      jar.set("mekan_visitor", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400,
        path: "/",
      });
    }
    const actorHash = hashToken(token);
    await rateLimit(`view:${actorHash}`, 60, 60);
    const p = await db.product.findFirst({
      where: {
        id: productId,
        status: "ACTIVE",
        store: { approval: "APPROVED" },
      },
    });
    if (!p) return NextResponse.json({ ok: false }, { status: 404 });
    if (
      !(await db.analyticsEvent.findFirst({
        where: {
          productId,
          kind: "PRODUCT_VIEW",
          actorHash,
          createdAt: { gte: new Date(Date.now() - 30 * 60000) },
        },
      }))
    )
      await db.analyticsEvent.create({
        data: { productId, kind: "PRODUCT_VIEW", actorHash },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
