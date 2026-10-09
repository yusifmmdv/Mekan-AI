import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { productInclude, ProductCard } from "@/components/catalog";
import { CompareLink } from "@/components/actions";
import { currentUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
export const metadata: Metadata = { title: "Mebel kataloqu" };
export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const s = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(s.page) || 1));
  const max = Number(s.max);
  const min = Number(s.min);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    store: { approval: "APPROVED" },
    ...(s.q
      ? {
          OR: [
            { name: { contains: s.q.slice(0, 100), mode: "insensitive" } },
            {
              description: { contains: s.q.slice(0, 100), mode: "insensitive" },
            },
          ],
        }
      : {}),
    ...(s.category ? { category: { slug: s.category } } : {}),
    ...(max > 0 || min > 0
      ? {
          price: {
            ...(max > 0 ? { lte: max } : {}),
            ...(min > 0 ? { gte: min } : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    s.sort === "price-asc"
      ? { price: "asc" }
      : s.sort === "price-desc"
        ? { price: "desc" }
        : { createdAt: "desc" };
  const [products, total, categories, u] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: (page - 1) * 12,
      take: 12,
    }),
    db.product.count({ where }),
    db.productCategory.findMany(),
    currentUser(),
  ]);
  const favorites = u
    ? await db.favorite.findMany({ where: { userId: u.id } })
    : [];
  const pageLink = (n: number) =>
    "/marketplace?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(s).filter(
          (entry): entry is [string, string] => !!entry[1],
        ),
      ),
      page: String(n),
    }).toString();
  return (
    <div className="container">
      <div className="page-title">
        <div className="eyebrow">Düşünülmüş seçimlər</div>
        <h1>Mebel kataloqu</h1>
        <p>Məkanınıza, üslubunuza və büdcənizə uyğun mebelləri tapın.</p>
      </div>
      <form className="filter-bar">
        <div>
          <label htmlFor="q">Məhsul axtar</label>
          <input
            id="q"
            name="q"
            defaultValue={s.q}
            placeholder="Divan, kreslo, masa…"
          />
        </div>
        <div>
          <label htmlFor="category">Kateqoriya</label>
          <select name="category" id="category" defaultValue={s.category || ""}>
            <option value="">Bütün kateqoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max">Maksimum qiymət · AZN</label>
          <input
            id="max"
            name="max"
            type="number"
            min="0"
            defaultValue={s.max}
          />
        </div>
        <div>
          <label htmlFor="sort">Sıralama</label>
          <select name="sort" id="sort" defaultValue={s.sort || ""}>
            <option value="">Ən yeni</option>
            <option value="price-asc">Qiymət: aşağıdan yuxarı</option>
            <option value="price-desc">Qiymət: yuxarıdan aşağı</option>
          </select>
        </div>
        <button className="btn">Axtar</button>
      </form>
      <div className="section-head">
        <small>{total} məhsul</small>
        <CompareLink />
      </div>
      {products.length ? (
        <div className="grid-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              saved={favorites.some((f) => f.productId === p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Uyğun məhsul tapılmadı.</h2>
          <Link href="/marketplace" className="btn secondary">
            Filtrləri sıfırla
          </Link>
        </div>
      )}
      <div className="pagination">
        {page > 1 && (
          <Link className="btn secondary" href={pageLink(page - 1)}>
            Əvvəlki
          </Link>
        )}
        <span>
          {page} / {Math.max(1, Math.ceil(total / 12))}
        </span>
        {page * 12 < total && (
          <Link className="btn secondary" href={pageLink(page + 1)}>
            Növbəti
          </Link>
        )}
      </div>
    </div>
  );
}
