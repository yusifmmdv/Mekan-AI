/* eslint-disable @next/next/no-img-element -- Private images require browser session cookies; storage already resizes and converts to WebP. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, roomLabels, styleLabels } from "@/lib/config";
import { ProductCard, productInclude } from "@/components/catalog";
import { DataForm, ActionButton, UploadForm } from "@/components/actions";
import { BusinessDashboard } from "@/components/business-dashboard";
export default async function Dashboard({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section: segments } = await params;
  const section = segments?.[0] || "overview";
  if ((segments?.length || 0) > 1) notFound();
  const u = await pageUser();
  if (["store", "designer", "admin"].includes(section)) {
    const role =
      section === "store"
        ? "STORE_OWNER"
        : section === "designer"
          ? "DESIGNER"
          : "ADMIN";
    await pageUser([role]);
    return <BusinessDashboard section={section} user={u} />;
  }
  if (section === "overview") {
    const [projectCount, orders, requests, notifications] = await Promise.all([
      db.designProject.count({ where: { userId: u.id } }),
      db.order.count({ where: { userId: u.id } }),
      db.designerRequest.count({ where: { userId: u.id } }),
      db.notification.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    const projects = await db.designProject.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { generations: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return (
      <>
        <div className="dashboard-title">
          <div>
            <div className="eyebrow">Sizin məkanınız</div>
            <h1>Salam, {u.name.split(" ")[0]}.</h1>
            <p>Yeni ideyalarınız və seçdiyiniz mebellər bir yerdə.</p>
          </div>
          <Link href="/studio" className="btn">
            Yeni dizayn
          </Link>
        </div>
        <div className="stat-grid">
          {[
            ["Dizayn layihələri", projectCount],
            ["Kredit balansı", u.wallet?.balance || 0],
            ["Sifariş sorğuları", orders],
            ["Dizayner sorğuları", requests],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <p>{label}</p>
              <span className="value">{value}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="section-head">
            <h2>Son layihələr</h2>
            <Link href="/dashboard/projects" className="text-link">
              Hamısına bax
            </Link>
          </div>
          <ProjectList projects={projects} />
        </div>
        {notifications.length > 0 && (
          <div className="panel" style={{ marginTop: 25 }}>
            <h2>Son bildirişlər</h2>
            {notifications.map((n) => (
              <div className="list-row" key={n.id}>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </div>
                <small>{n.createdAt.toLocaleDateString("az-AZ")}</small>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }
  if (section === "projects") {
    const projects = await db.designProject.findMany({
      where: { userId: u.id },
      include: { generations: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return (
      <>
        <div className="dashboard-title">
          <div>
            <h1>Dizayn layihələrim</h1>
            <p>Şəxsi layihələr və generasiya tarixçəsi.</p>
          </div>
          <Link className="btn" href="/studio">
            Yeni layihə
          </Link>
        </div>
        <ProjectList projects={projects} />
      </>
    );
  }
  if (section === "favorites") {
    const favorites = await db.favorite.findMany({
      where: {
        userId: u.id,
        product: { status: "ACTIVE", store: { approval: "APPROVED" } },
      },
      include: { product: { include: productInclude } },
      take: 60,
    });
    return (
      <>
        <div className="dashboard-title">
          <h1>Seçilmiş mebellər</h1>
        </div>
        {favorites.length ? (
          <div className="grid-3">
            {favorites.map((f) => (
              <ProductCard key={f.productId} product={f.product} saved />
            ))}
          </div>
        ) : (
          <Empty
            text="Hələ mebel seçməmisiniz."
            href="/marketplace"
            label="Kataloqu kəşf et"
          />
        )}
      </>
    );
  }
  if (section === "orders") {
    const [orders, inquiries, requests] = await Promise.all([
      db.order.findMany({
        where: { userId: u.id },
        include: { store: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      db.inquiry.findMany({
        where: { userId: u.id },
        include: { store: true },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      db.designerRequest.findMany({
        where: { userId: u.id },
        include: { designer: true, service: true, review: true },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
    ]);
    return (
      <>
        <div className="dashboard-title">
          <h1>Sifariş və sorğular</h1>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Sifariş sorğuları</h2>
            {orders.length ? (
              orders.map((o) => (
                <div className="list-row" key={o.id}>
                  <div>
                    <h3>
                      {o.store.name} · {money(o.total)}
                    </h3>
                    <p>
                      {o.items
                        .map((i) => `${i.productName} × ${i.quantity}`)
                        .join(", ")}
                    </p>
                    <small>
                      {o.createdAt.toLocaleDateString("az-AZ")} · Ödəniş
                      platformada tutulmayıb.
                    </small>
                  </div>
                  <span className="badge">{statusLabel(o.status)}</span>
                </div>
              ))
            ) : (
              <p>Hələ sifariş sorğusu yoxdur.</p>
            )}
          </div>
          <div className="panel">
            <h2>Mağazalara sorğular</h2>
            {inquiries.length ? (
              inquiries.map((i) => (
                <div className="list-row" key={i.id}>
                  <div>
                    <h3>{i.store.name}</h3>
                    <p>{i.message}</p>
                    {i.reply && (
                      <p>
                        <strong>Cavab:</strong> {i.reply}
                      </p>
                    )}
                  </div>
                  <span className="badge">{statusLabel(i.status)}</span>
                </div>
              ))
            ) : (
              <p>Hələ sorğu yoxdur.</p>
            )}
          </div>
          <div className="panel">
            <h2>Dizayner xidmətləri</h2>
            {requests.length ? (
              requests.map((r) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <h3>
                      {r.designer.displayName} · {r.service.title}
                    </h3>
                    <p>{r.brief}</p>
                    {r.reply && <p>Cavab: {r.reply}</p>}
                    <span className="badge">{statusLabel(r.status)}</span>
                    {r.status === "COMPLETED" && !r.review && (
                      <DataForm
                        endpoint="reviews"
                        extra={{ requestId: r.id }}
                        fields={[
                          {
                            name: "rating",
                            label: "Qiymət · 1–5",
                            type: "number",
                            min: 1,
                            max: 5,
                            required: true,
                            value: 5,
                          },
                          {
                            name: "text",
                            label: "Xidmət barədə rəy",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                        submit="Rəy əlavə et"
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>Hələ dizayner sorğusu yoxdur.</p>
            )}
          </div>
        </div>
      </>
    );
  }
  if (section === "credits") {
    const [ledger, payments, subscriptions] = await Promise.all([
      db.creditTransaction.findMany({
        where: { wallet: { userId: u.id } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.payment.findMany({
        where: { userId: u.id },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.subscription.findMany({
        where: { userId: u.id },
        include: { plan: true },
        orderBy: { startsAt: "desc" },
        take: 20,
      }),
    ]);
    return (
      <>
        <div className="dashboard-title">
          <h1>Kreditlər və planlar</h1>
          <Link href="/pricing" className="btn secondary">
            Planlara bax
          </Link>
        </div>
        <div className="stat">
          <p>Kredit balansı</p>
          <span className="value">{u.wallet?.balance || 0}</span>
        </div>
        <div className="stack" style={{ marginTop: 25 }}>
          <div className="panel">
            <h2>Kredit tarixçəsi</h2>
            {ledger.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarix</th>
                      <th>Əməliyyat</th>
                      <th>Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((t) => (
                      <tr key={t.id}>
                        <td>{t.createdAt.toLocaleString("az-AZ")}</td>
                        <td>{t.reason}</td>
                        <td>
                          {t.amount > 0 ? "+" : ""}
                          {t.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Hələ kredit əməliyyatı yoxdur.</p>
            )}
          </div>
          <div className="panel">
            <h2>Ödəniş sorğuları</h2>
            {payments.map((p) => (
              <div className="list-row" key={p.id}>
                <div>
                  <h3>
                    {p.plan.name} · {money(p.amount)}
                  </h3>
                  <p>
                    {p.status === "CONFIRMED"
                      ? "Administrator tərəfindən təsdiqlənib"
                      : p.status === "REJECTED"
                        ? "Sorğu rədd edilib"
                        : "Real ödənişin administrator yoxlaması gözlənilir"}
                  </p>
                </div>
                <span className="badge">{p.status}</span>
              </div>
            ))}
            {!payments.length && <p>Ödəniş qeydi yoxdur.</p>}
          </div>
          <div className="panel">
            <h2>Abunəliklər</h2>
            {subscriptions.map((s) => (
              <div className="list-row" key={s.id}>
                <h3>{s.plan.name}</h3>
                <p>
                  {s.expiresAt > new Date() ? "Aktiv" : "Müddəti bitib"} ·{" "}
                  {s.expiresAt.toLocaleDateString("az-AZ")}
                </p>
              </div>
            ))}
            {!subscriptions.length && <p>Aktiv abunəliyiniz yoxdur.</p>}
          </div>
        </div>
      </>
    );
  }
  if (section === "settings") {
    const sessions = await db.session.findMany({
      where: { userId: u.id },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    const assets = await db.imageAsset.findMany({
      where: { ownerId: u.id },
      take: 30,
      orderBy: { createdAt: "desc" },
    });
    return (
      <>
        <div className="dashboard-title">
          <h1>Hesab parametrləri</h1>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Profil</h2>
            <DataForm
              endpoint="profile"
              fields={[
                {
                  name: "name",
                  label: "Ad və soyad",
                  required: true,
                  value: u.name,
                },
                {
                  name: "phone",
                  label: "Telefon",
                  value: u.profile?.phone || "",
                },
                {
                  name: "city",
                  label: "Şəhər",
                  value: u.profile?.city || "Bakı",
                },
                {
                  name: "bio",
                  label: "Haqqınızda",
                  type: "textarea",
                  value: u.profile?.bio || "",
                },
              ]}
            />
          </div>
          <div className="panel">
            <h2>Təhlükəsizlik</h2>
            <p>
              {u.email} ·{" "}
              {u.emailVerified ? "E-poçt təsdiqlənib" : "E-poçt təsdiqlənməyib"}
            </p>
            <Link href="/forgot-password" className="text-link">
              Şifrəni yenilə
            </Link>
            {sessions.map((s) => (
              <div className="list-row" key={s.id}>
                <small>
                  Giriş: {s.createdAt.toLocaleString("az-AZ")} · Bitmə:{" "}
                  {s.expiresAt.toLocaleDateString("az-AZ")}
                </small>
                <ActionButton
                  endpoint="sessions/revoke"
                  data={{ sessionId: s.id }}
                  label="Sessiyanı bağla"
                  variant="secondary small"
                  confirm
                />
              </div>
            ))}
          </div>
          <div className="panel">
            <h2>Yüklənmiş şəkillər</h2>
            <p>
              Layihə və məhsulda istifadə edilən şəkilləri silmək mümkün deyil.
            </p>
            {assets.map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <small>
                    {a.purpose} · {Math.round(a.size / 1024)} KB
                  </small>
                </div>
                <ActionButton
                  endpoint="assets/delete"
                  data={{ assetId: a.id }}
                  label="Şəkli sil"
                  variant="secondary small"
                  confirm
                />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }
  if (section === "notifications") {
    const items = await db.notification.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <>
        <div className="dashboard-title">
          <h1>Bildirişlər</h1>
          <ActionButton
            endpoint="notifications/read"
            data={{}}
            label="Hamısını oxunmuş qeyd et"
            variant="secondary"
          />
        </div>
        <div className="panel">
          {items.map((n) => (
            <div className="list-row" key={n.id}>
              <div>
                <h3>
                  {n.title} {!n.readAt && <span className="badge">Yeni</span>}
                </h3>
                <p>{n.body}</p>
              </div>
              <small>{n.createdAt.toLocaleDateString("az-AZ")}</small>
            </div>
          ))}
          {!items.length && <p>Hələ bildiriş yoxdur.</p>}
        </div>
      </>
    );
  }
  if (section === "realtor") {
    await pageUser(["REALTOR"]);
    const properties = await db.property.findMany({
      where: { userId: u.id },
      include: {
        images: true,
        projects: {
          include: { designProject: { include: { generations: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return (
      <>
        <div className="dashboard-title">
          <div>
            <h1>Əmlak layihələri</h1>
            <p>
              {u.wallet?.balance || 0} generasiya krediti · Nəticələr virtual
              səhnələşdirmə kimi işarələnir.
            </p>
          </div>
          <Link href="/studio" className="btn">
            Staging yarat
          </Link>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Yeni əmlak əlavə edin</h2>
            <UploadForm
              purpose="PROPERTY"
              endpoint="properties"
              fields={propertyFields()}
              submit="Əmlakı yadda saxla"
            />
          </div>
          {properties.map((p) => (
            <details className="panel" key={p.id}>
              <summary>
                <strong>{p.title}</strong> · {p.location} · {p.area} m² ·{" "}
                {p.roomCount} otaq
              </summary>
              <div className="stack" style={{ marginTop: 22 }}>
                <DataForm
                  endpoint="properties"
                  fields={propertyFields(p)}
                  extra={{ id: p.id, imageIds: p.images.map((i) => i.assetId) }}
                />
                <div className="grid-3">
                  {p.projects.map((s) => (
                    <Link
                      className="panel"
                      href={`/dashboard/projects/${s.designProjectId}`}
                      key={s.id}
                    >
                      <h3>{s.designProject.title}</h3>
                      <span className="badge">Virtual səhnələşdirmə</span>
                      <p>{s.designProject.generations.length} generasiya</p>
                    </Link>
                  ))}
                </div>
                <Link href="/studio" className="text-link">
                  Bu əmlak üçün studiyada layihə yaradın →
                </Link>
              </div>
            </details>
          ))}
        </div>
      </>
    );
  }
  notFound();
}
function statusLabel(s: string) {
  return (
    (
      {
        NEW: "Yeni",
        ACCEPTED: "Qəbul edilib",
        IN_PROGRESS: "İş davam edir",
        COMPLETED: "Tamamlanıb",
        CANCELLED: "Ləğv edilib",
      } as Record<string, string>
    )[s] || s
  );
}
function Empty({
  text,
  href,
  label,
}: {
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="empty">
      <h2>{text}</h2>
      <Link href={href} className="btn">
        {label}
      </Link>
    </div>
  );
}
function ProjectList({
  projects,
}: {
  projects: {
    id: string;
    title: string;
    imageId: string;
    roomType: string;
    style: string;
    generations: { status: string; outputImageId: string | null }[];
  }[];
}) {
  return projects.length ? (
    <div className="grid-3">
      {projects.map((p) => (
        <Link
          className="project-card"
          href={`/dashboard/projects/${p.id}`}
          key={p.id}
        >
          <img
            src={`/api/images/${p.generations[0]?.outputImageId || p.imageId}`}
            alt={p.title}
            width="500"
            height="320"
          />
          <h3>{p.title}</h3>
          <p>
            {roomLabels[p.roomType]} · {styleLabels[p.style]}
          </p>
          <span className="badge">
            {p.generations[0]?.status || "Layihə saxlanılıb"}
          </span>
        </Link>
      ))}
    </div>
  ) : (
    <Empty
      text="İlk məkanınızı yaradın."
      href="/studio"
      label="Dizayn studiyasına keç"
    />
  );
}
function propertyFields(p?: {
  title: string;
  location: string;
  type: string;
  roomCount: number;
  area: number;
  description: string;
}) {
  return [
    { name: "title", label: "Əmlak adı", required: true, value: p?.title },
    {
      name: "location",
      label: "Ünvan / rayon",
      required: true,
      value: p?.location,
    },
    {
      name: "type",
      label: "Əmlak tipi",
      required: true,
      value: p?.type || "Mənzil",
    },
    {
      name: "roomCount",
      label: "Otaq sayı",
      type: "number",
      required: true,
      min: 1,
      value: p?.roomCount || 2,
    },
    {
      name: "area",
      label: "Sahə · m²",
      type: "number",
      required: true,
      min: 1,
      value: p?.area || 80,
    },
    {
      name: "description",
      label: "Təsvir",
      type: "textarea",
      required: true,
      value: p?.description,
    },
  ];
}
