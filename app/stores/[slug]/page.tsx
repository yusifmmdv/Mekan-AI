/* eslint-disable @next/next/no-img-element -- Controlled uploaded logo endpoint. */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductCard, productInclude } from "@/components/catalog";
import { DataForm } from "@/components/actions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await db.store.findFirst({ where: { slug, approval: "APPROVED" } });
  return { title: s?.name || "Mağaza" };
}
export default async function Store({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await db.store.findFirst({
    where: { slug, approval: "APPROVED" },
    include: {
      products: {
        where: { status: "ACTIVE" },
        include: productInclude,
        take: 48,
      },
    },
  });
  if (!s) notFound();
  return (
    <div className="container">
      <div className="page-title">
        {s.logoAssetId && (
          <img
            src={`/api/images/${s.logoAssetId}`}
            alt={`${s.name} logosu`}
            width={96}
            height={96}
            style={{ marginBottom: 20 }}
          />
        )}
        {s.demo && <span className="badge">Demo mağaza</span>}
        <h1 style={{ marginTop: 15 }}>{s.name}</h1>
        <p>{s.description}</p>
      </div>
      <div className="grid-2">
        <div className="panel">
          <h3>Əlaqə məlumatları</h3>
          <p>{s.address}</p>
          <p>{s.phone}</p>
          <p>{s.email}</p>
        </div>
        <div className="panel">
          <h3>Mağazaya yazın</h3>
          <DataForm
            endpoint="inquiries"
            extra={{ storeId: s.id }}
            fields={[
              {
                name: "message",
                label: "Mesaj",
                type: "textarea",
                required: true,
              },
            ]}
            submit="Göndər"
          />
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Mağazanın kolleksiyası</h2>
        </div>
        <div className="grid-4">
          {s.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
