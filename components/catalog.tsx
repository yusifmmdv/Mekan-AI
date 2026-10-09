import Image from "next/image";
import Link from "next/link";
import { ProductActions, CompareToggle } from "./actions";
import { money } from "@/lib/config";
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  price: unknown;
  discountPrice: unknown;
  stock: number;
  demo: boolean;
  images: { url: string | null; assetId: string | null; alt: string }[];
  store: { name: string; slug: string };
  category: { name: string };
};
export const imageUrl = (p: CatalogProduct) =>
  p.images[0]?.assetId
    ? `/api/images/${p.images[0].assetId}`
    : p.images[0]?.url || "";
export function ProductCard({
  product: p,
  saved = false,
}: {
  product: CatalogProduct;
  saved?: boolean;
}) {
  return (
    <article className="product-card">
      <Link href={`/marketplace/${p.slug}`} className="product-image">
        {imageUrl(p) ? (
          <Image
            src={imageUrl(p)}
            alt={p.images[0]?.alt || p.name}
            width={500}
            height={460}
            unoptimized={!!p.images[0]?.assetId}
          />
        ) : (
          <div className="empty">Şəkil əlavə edilməyib</div>
        )}
        {p.demo && <span className="badge product-badge">Demo kolleksiya</span>}
      </Link>
      <ProductActions productId={p.id} saved={saved} stock={p.stock} />
      <div className="product-info">
        <p>{p.category.name}</p>
        <h3>
          <Link href={`/marketplace/${p.slug}`}>{p.name}</Link>
        </h3>
        <p>
          <Link href={`/stores/${p.store.slug}`}>{p.store.name}</Link>
        </p>
        <p className="price">
          {money(Number(p.discountPrice || p.price))}
          {!!p.discountPrice && (
            <small style={{ textDecoration: "line-through", marginLeft: 10 }}>
              {money(Number(p.price))}
            </small>
          )}
        </p>
        <CompareToggle id={p.id} />
      </div>
    </article>
  );
}
export const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  store: true,
  category: true,
};
