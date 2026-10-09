import Link from "next/link";
import { pageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/config";
import { ActionButton, DataForm } from "@/components/actions";
export default async function Cart() {
  const u = await pageUser();
  const cart = await db.cart.findUnique({
    where: { userId: u.id },
    include: { items: { include: { product: { include: { store: true } } } } },
  });
  return (
    <div className="container">
      <div className="page-title">
        <h1>Səbətiniz</h1>
        <p>Məhsullar üçün mağazalara sifariş sorğusu göndərin.</p>
      </div>
      {cart?.items.length ? (
        <div className="grid-2 section">
          <div className="panel">
            {cart.items.map((i) => (
              <div className="list-row" key={i.id}>
                <div>
                  <h3>
                    <Link href={`/marketplace/${i.product.slug}`}>
                      {i.product.name}
                    </Link>
                  </h3>
                  <p>
                    {i.product.store.name} · {i.quantity} ədəd ·{" "}
                    {money(
                      Number(i.product.discountPrice || i.product.price) *
                        i.quantity,
                    )}
                  </p>
                </div>
                <div className="actions">
                  <ActionButton
                    endpoint="cart"
                    data={{
                      productId: i.productId,
                      quantity: Math.min(100, i.quantity + 1),
                    }}
                    label="+"
                    variant="secondary small"
                  />
                  <ActionButton
                    endpoint="cart"
                    data={{
                      productId: i.productId,
                      quantity: Math.max(0, i.quantity - 1),
                    }}
                    label="−"
                    variant="secondary small"
                  />
                  <ActionButton
                    endpoint="cart"
                    data={{ productId: i.productId, quantity: 0 }}
                    label="Sil"
                    variant="secondary small"
                    confirm
                  />
                </div>
              </div>
            ))}
            <h3 style={{ marginTop: 25 }}>
              Cəmi:{" "}
              {money(
                cart.items.reduce(
                  (a, i) =>
                    a +
                    Number(i.product.discountPrice || i.product.price) *
                      i.quantity,
                  0,
                ),
              )}
            </h3>
          </div>
          <div className="panel">
            <h2>Sifariş sorğusu</h2>
            <div className="notice">
              Ödəniş tutulmur. Mağaza stok, çatdırılma və ödəniş şərtlərini
              sizinlə razılaşdıracaq.
            </div>
            <DataForm
              endpoint="orders"
              fields={[
                {
                  name: "contact",
                  label: "Telefon və ya əlaqə məlumatı",
                  required: true,
                },
                { name: "note", label: "Əlavə qeyd", type: "textarea" },
              ]}
              submit="Mağazaya sorğu göndər"
              redirectTo="/dashboard/orders"
            />
          </div>
        </div>
      ) : (
        <div className="empty">
          <h2>Səbətiniz hələ boşdur.</h2>
          <Link href="/marketplace" className="btn">
            Mebelləri kəşf et
          </Link>
        </div>
      )}
    </div>
  );
}
