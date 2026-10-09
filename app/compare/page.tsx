import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/config";
export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const products = await db.product.findMany({
    where: {
      id: { in: (ids || "").split(",").slice(0, 4) },
      status: "ACTIVE",
      store: { approval: "APPROVED" },
    },
    include: { store: true },
  });
  return (
    <div className="container">
      <div className="page-title">
        <h1>Məhsul müqayisəsi</h1>
        <p>Kataloqda “Müqayisə et” düyməsi ilə ən çox 4 məhsul seçin.</p>
      </div>
      {products.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Xüsusiyyət</th>
                {products.map((p) => (
                  <th key={p.id}>
                    <Link href={`/marketplace/${p.slug}`}>{p.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Qiymət",
                  ...products.map((p) => money(p.discountPrice || p.price)),
                ],
                ["Mağaza", ...products.map((p) => p.store.name)],
                [
                  "Ölçülər · sm",
                  ...products.map(
                    (p) =>
                      `${p.width || "—"} × ${p.depth || "—"} × ${p.height || "—"}`,
                  ),
                ],
                ["Materiallar", ...products.map((p) => p.materials.join(", "))],
                ["Stok", ...products.map((p) => String(p.stock))],
              ].map(([label, ...values]) => (
                <tr key={label}>
                  <th>{label}</th>
                  {values.map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h2>Məhsul seçilməyib.</h2>
          <Link className="btn" href="/marketplace">
            Kataloqa keç
          </Link>
        </div>
      )}
    </div>
  );
}
