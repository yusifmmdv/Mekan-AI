import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { canReadProjectAsset } from "@/lib/project-access";
import { readAsset } from "@/lib/storage";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const a = await db.imageAsset.findUnique({
    where: { id },
    include: {
      products: { include: { product: { include: { store: true } } } },
      stores: true,
      portfolio: { include: { designer: true } },
    },
  });
  if (!a) return new Response("Not found", { status: 404 });
  const u = await currentUser();
  const publicAsset =
    a.products.some(
      (i) =>
        i.product.status === "ACTIVE" &&
        i.product.store.approval === "APPROVED",
    ) ||
    a.stores.some((s) => s.approval === "APPROVED") ||
    a.portfolio.some((p) => p.designer.approval === "APPROVED");
  const moderationAccess =
    u?.role === "ADMIN" && ["PRODUCT", "LOGO", "PORTFOLIO"].includes(a.purpose);
  if (
    !publicAsset &&
    u?.id !== a.ownerId &&
    !moderationAccess &&
    !(u && (await canReadProjectAsset(u.id, a.id)))
  )
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readAsset(a.key);
    const download = new URL(request.url).searchParams.has("download");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": a.mime,
        "Cache-Control": publicAsset
          ? "public, max-age=3600"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${a.purpose === "GENERATION" ? "mekan-virtual-design" : "mekan-image"}.webp"`,
            }
          : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
