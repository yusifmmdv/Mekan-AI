import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductActions, DataForm, CompareToggle } from "@/components/actions";
import { productInclude, ProductCard, imageUrl } from "@/components/catalog";
import { money } from "@/lib/config";
import { currentUser } from "@/lib/auth";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await db.product.findFirst({
    where: { slug, status: "ACTIVE", store: { approval: "APPROVED" } },
  });
  return {
    title: p?.name || "Məhsul",
    description: p?.description.slice(0, 160),
  };
}
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await db.product.findFirst({
    where: { slug, status: "ACTIVE", store: { approval: "APPROVED" } },
    include: productInclude,
  });
  if (!p) notFound();
  const u = await currentUser();
  const related = await db.product.findMany({
    where: {
      categoryId: p.categoryId,
      status: "ACTIVE",
      store: { approval: "APPROVED" },
      id: { not: p.id },
    },
    include: productInclude,
    take: 4,
  });
  return (
    <div className="container">
      <div className="detail-grid">
        <div>
          {imageUrl(p) ? (
            <Image
              src={imageUrl(p)}
              alt={p.name}
              width={900}
              height={900}
              className="main-image"
              unoptimized={!!p.images[0]?.assetId}
            />
          ) : (
            <div className="empty">Şəkil yoxdur.</div>
          )}
          <ViewTracker productId={p.id} />
        </div>
        <div className="detail-info">
          <Link href="/marketplace" className="text-link">
            ← Mebel kataloqu
          </Link>
          <div style={{ marginTop: 22 }}>
            {p.demo && (
              <span className="badge">Demo məhsul · illüstrativ foto</span>
            )}
          </div>
          <h1>{p.name}</h1>
          <Link href={`/stores/${p.store.slug}`} className="text-link">
            {p.store.name}
          </Link>
          <p className="price">{money(p.discountPrice || p.price)}</p>
          <p>{p.description}</p>
          <div className="specs">
            {[
              [
                "Ölçülər",
                `${p.width || "—"} × ${p.depth || "—"} × ${p.height || "—"} sm`,
              ],
              ["Materiallar", p.materials.join(", ")],
              ["Rənglər", p.colors.join(", ")],
              ["Mövcudluq", p.stock > 0 ? `${p.stock} ədəd` : "Stokda yoxdur"],
              ["SKU", p.sku],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "relative", height: 60 }}>
            <ProductActions productId={p.id} stock={p.stock} />
            <CompareToggle id={p.id} />
          </div>
          <div className="panel" style={{ marginTop: 25 }}>
            <h3>Satıcıya sual verin</h3>
            <DataForm
              endpoint="inquiries"
              extra={{ storeId: p.storeId, productId: p.id }}
              fields={[
                {
                  name: "message",
                  label: "Mesajınız",
                  type: "textarea",
                  required: true,
                },
              ]}
              submit="Sorğu göndər"
            />
            {!u && <small>Sorğunu göndərmək üçün hesabınıza daxil olun.</small>}
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Oxşar seçimlər</h2>
          </div>
          <div className="grid-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
import { ViewTracker } from "@/components/view-tracker";
