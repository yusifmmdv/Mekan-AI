/* eslint-disable @next/next/no-img-element -- Private images require browser session cookies; storage already resizes and converts to WebP. */
import Link from "next/link";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import { translate } from "@/lib/i18n";
import { AnalyticsChart } from "./analytics-chart";
import type { requireUser } from "@/lib/auth";
import { money, roomTypes, styles } from "@/lib/config";
import { DataForm, ActionButton, UploadForm, type Field } from "./actions";
type User = Awaited<ReturnType<typeof requireUser>>;
const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: translate(value) }));
const statuses = options([
  "NEW",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
const roles = options([
  "CUSTOMER",
  "REALTOR",
  "STORE_OWNER",
  "DESIGNER",
  "ADMIN",
]);
const approvals = options(["PENDING", "APPROVED", "REJECTED"]);
const field = (
  name: string,
  label: string,
  value?: string | number | boolean,
  type = "text",
  required = true,
): Field => ({ name, label, value, type, required });
const date = (d: Date) => d.toLocaleString("az-AZ");
function Empty() {
  return <p className="muted">Hələ qeyd yoxdur.</p>;
}
function AdminForm({
  action,
  targetId,
  fields,
}: {
  action: string;
  targetId: string;
  fields: Field[];
}) {
  return (
    <DataForm
      endpoint="admin"
      transform="admin"
      extra={{ action, targetId }}
      fields={fields}
    />
  );
}
export async function BusinessDashboard({
  section,
  user,
}: {
  section: string;
  user: User;
}) {
  const requiredRole = (
    { store: "STORE_OWNER", designer: "DESIGNER", admin: "ADMIN" } as Record<
      string,
      string
    >
  )[section];
  assert(
    !requiredRole || user.role === requiredRole,
    403,
    "FORBIDDEN",
    "Bu panel üçün icazəniz yoxdur.",
  );
  if (section === "store") {
    const store = await db.store.findUnique({ where: { ownerId: user.id } });
    const [categories, products, orders, inquiries, events] = await Promise.all(
      [
        db.productCategory.findMany({ orderBy: { name: "asc" } }),
        db.product.findMany({
          where: { store: { ownerId: user.id } },
          include: { images: true },
          orderBy: { createdAt: "desc" },
        }),
        db.order.findMany({
          where: { store: { ownerId: user.id } },
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.inquiry.findMany({
          where: { store: { ownerId: user.id } },
          include: { product: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.analyticsEvent.groupBy({
          by: ["kind"],
          where: { product: { store: { ownerId: user.id } } },
          _count: true,
        }),
      ],
    );
    const [orderTotals, completedTotals, popular] = await Promise.all([
      db.order.aggregate({
        where: { store: { ownerId: user.id } },
        _count: true,
      }),
      db.order.aggregate({
        where: { store: { ownerId: user.id }, status: "COMPLETED" },
        _count: true,
        _sum: { total: true },
      }),
      db.analyticsEvent.groupBy({
        by: ["productId"],
        where: {
          product: { store: { ownerId: user.id } },
          kind: "PRODUCT_VIEW",
        },
        _count: true,
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      }),
    ]);
    const views = events.find((e) => e.kind === "PRODUCT_VIEW")?._count || 0;
    const inquiryEvents = events.find((e) => e.kind === "INQUIRY")?._count || 0;
    const storeFields: Field[] = [
      field("name", "Mağaza adı", store?.name),
      field("description", "Təsvir", store?.description, "textarea"),
      field("phone", "Telefon", store?.phone),
      field("email", "E-poçt", store?.email || user.email, "email"),
      field("address", "Ünvan", store?.address),
    ];
    function productFields(p?: (typeof products)[number]): Field[] {
      return [
        field("name", "Məhsul adı", p?.name),
        field("description", "Təsvir", p?.description, "textarea"),
        {
          name: "categoryId",
          label: "Kateqoriya",
          required: true,
          value: p?.categoryId || categories[0]?.id,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        field(
          "price",
          "Qiymət · AZN",
          p ? Number(p.price) : undefined,
          "number",
        ),
        field(
          "discountPrice",
          "Endirim qiyməti",
          p?.discountPrice ? Number(p.discountPrice) : undefined,
          "number",
          false,
        ),
        field("brand", "Brend", p?.brand || "", "text", false),
        field("sku", "SKU", p?.sku),
        field("stock", "Stok", p?.stock || 0, "number"),
        ...(["width", "height", "depth"] as const).map((name, i) =>
          field(
            name,
            ["En · sm", "Hündürlük · sm", "Dərinlik · sm"][i],
            p?.[name] ?? undefined,
            "number",
            false,
          ),
        ),
        ...(["materials", "colors", "tags"] as const).map((name, i) =>
          field(
            name,
            ["Materiallar", "Rənglər", "Etiketlər"][i],
            p?.[name].join(", ") || "",
            "list",
            false,
          ),
        ),
        field(
          "roomTypes",
          "Otaq növləri",
          p?.roomTypes.join(", ") || roomTypes[0],
          "list",
        ),
        field("styles", "Üslublar", p?.styles.join(", ") || styles[0], "list"),
      ];
    }
    return (
      <div className="stack">
        <div className="panel">
          <h2>Mağaza profili</h2>
          <p>
            Status: {store ? translate(store.approval) : "Yaradılmayıb"}.
            Dəyişikliklər yenidən moderasiyaya göndərilir.
          </p>
          <UploadForm
            purpose="LOGO"
            endpoint="store/profile"
            fields={storeFields}
            extra={store?.logoAssetId ? { logoAssetId: store.logoAssetId } : {}}
          />
        </div>
        <div className="panel">
          <h2>Qeydə alınan nəticələr · bütün dövr</h2>
          <div className="grid-2">
            {events.map((e) => (
              <p key={e.kind}>
                {translate(e.kind)}: <strong>{e._count}</strong>
              </p>
            ))}
            <p>Sifariş sorğuları: {orderTotals._count}</p>
            <p>Tamamlanan sifarişlər: {completedTotals._count}</p>
            <p>
              Tamamlanan sifarişlər üzrə məbləğ:{" "}
              {money(completedTotals._sum.total || 0)}
            </p>
            <p>
              Sorğu / baxış nisbəti:{" "}
              {views
                ? `${((inquiryEvents / views) * 100).toFixed(1)}%`
                : "Baxış yoxdur"}{" "}
              ({inquiryEvents} məhsul sorğusu / {views} qeydə alınan baxış)
            </p>
          </div>
          <AnalyticsChart
            title="Platformada qeydə alınan məhsul hadisələri"
            data={events.map((e) => ({
              name: translate(e.kind),
              count: e._count,
            }))}
          />
          <h3>Ən çox baxılan məhsullar</h3>
          {popular.length ? (
            popular.map((p) => (
              <p key={p.productId}>
                {products.find((product) => product.id === p.productId)?.name ||
                  "Məhsul"}{" "}
                · {p._count} baxış
              </p>
            ))
          ) : (
            <Empty />
          )}
          <small>
            Bu rəqəmlər platforma qeydləridir; ödəniş təsdiqi və bazar
            statistikası deyil. Sorğu/baxış nisbəti unikal müştəri konversiyası
            deyil; təkrar hadisələri də sayır.
          </small>
        </div>
        {store && (
          <>
            <div className="panel">
              <h2>Məhsul əlavə et</h2>
              <p>
                Şəkil yükləndikdə məhsula əlavə olunur. Redaktədə yeni şəkil
                əvvəlki şəkilləri əvəz edir.
              </p>
              <p>
                Otaq növləri: {roomTypes.join(", ")}. Üslublar:{" "}
                {styles.join(", ")}.
              </p>
              <UploadForm
                purpose="PRODUCT"
                endpoint="store/products"
                fields={productFields()}
              />
            </div>
            <div className="panel">
              <h2>Məhsullar ({products.length})</h2>
              {!products.length && <Empty />}
              {products.map((p) => (
                <details key={p.id}>
                  <summary>
                    {p.name} · {money(p.price)} · {translate(p.status)}
                  </summary>
                  <UploadForm
                    purpose="PRODUCT"
                    endpoint="store/products"
                    fields={productFields(p)}
                    extra={{
                      id: p.id,
                      imageIds: p.images.flatMap((i) =>
                        i.assetId ? [i.assetId] : [],
                      ),
                    }}
                  />
                  <ActionButton
                    endpoint="store/archive"
                    data={{ productId: p.id }}
                    label="Arxivlə"
                    variant="secondary"
                    confirm
                  />
                </details>
              ))}
            </div>
          </>
        )}
        <div className="panel">
          <h2>Sifariş sorğuları</h2>
          {!orders.length && <Empty />}
          {orders.map((o) => (
            <details key={o.id}>
              <summary>
                {o.id.slice(-8)} · {money(o.total)} · {translate(o.status)}
              </summary>
              <p>
                {o.contact} · {o.note}
              </p>
              {o.items.map((i) => (
                <p key={i.id}>
                  {i.productName} × {i.quantity} · {money(i.unitPrice)}
                </p>
              ))}
              <DataForm
                endpoint="store/orders"
                extra={{ orderId: o.id }}
                fields={[
                  {
                    name: "status",
                    label: "Status",
                    options: statuses,
                    value: o.status,
                  },
                ]}
              />
            </details>
          ))}
        </div>
        <div className="panel">
          <h2>Müştəri sorğuları</h2>
          {!inquiries.length && <Empty />}
          {inquiries.map((i) => (
            <details key={i.id}>
              <summary>
                {i.product?.name || "Mağaza sorğusu"} · {translate(i.status)}
              </summary>
              <p>{i.message}</p>
              {i.projectId && (
                <Link
                  className="text-link"
                  href={`/project-brief/${i.projectId}`}
                >
                  Redizaynı və otaq şəkillərini aç
                </Link>
              )}
              <DataForm
                endpoint="store/inquiries"
                extra={{ inquiryId: i.id }}
                fields={[field("reply", "Cavab", i.reply || "", "textarea")]}
              />
            </details>
          ))}
        </div>
      </div>
    );
  }
  if (section === "designer") {
    const profile = await db.designerProfile.findUnique({
      where: { userId: user.id },
      include: {
        services: true,
        portfolio: true,
        requests: {
          include: { service: true, commission: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });
    const serviceFields = (
      s?: NonNullable<typeof profile>["services"][number],
    ): Field[] => [
      field("title", "Xidmət adı", s?.title),
      field("description", "Təsvir", s?.description, "textarea"),
      field("price", "Qiymət · AZN", s ? Number(s.price) : 0, "number"),
      field("active", "Aktiv", s?.active ?? true, "checkbox", false),
    ];
    return (
      <div className="stack">
        <div className="panel">
          <h2>Peşəkar profil</h2>
          <p>
            Status: {profile ? translate(profile.approval) : "Yaradılmayıb"}
          </p>
          <DataForm
            endpoint="designer/profile"
            fields={[
              field("displayName", "Ad", profile?.displayName || user.name),
              field("bio", "Haqqınızda", profile?.bio, "textarea"),
              field("city", "Şəhər", profile?.city || "Bakı"),
              field(
                "available",
                "Yeni sifarişlər qəbul edirəm",
                profile?.available ?? true,
                "checkbox",
                false,
              ),
            ]}
          />
        </div>
        {profile && (
          <>
            <div className="panel">
              <h2>Yeni xidmət</h2>
              <DataForm endpoint="designer/services" fields={serviceFields()} />
              {profile.services.map((s) => (
                <details key={s.id}>
                  <summary>
                    {s.title} · {money(s.price)}
                  </summary>
                  <DataForm
                    endpoint="designer/services"
                    extra={{ id: s.id }}
                    fields={serviceFields(s)}
                  />
                </details>
              ))}
            </div>
            <div className="panel">
              <h2>Portfolio</h2>
              <UploadForm
                purpose="PORTFOLIO"
                endpoint="designer/portfolio"
                fields={[field("title", "İşin adı")]}
              />
              {profile.portfolio.map((p) => (
                <div className="list-row" key={p.id}>
                  <img
                    src={`/api/images/${p.assetId}`}
                    alt={p.title}
                    width={120}
                    height={90}
                  />
                  <span>{p.title}</span>
                  <ActionButton
                    endpoint="designer/portfolio-delete"
                    data={{ itemId: p.id }}
                    label="Sil"
                    confirm
                    variant="secondary"
                  />
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Müştəri istəkləri</h2>
              {!profile.requests.length && <Empty />}
              {profile.requests.map((r) => (
                <details key={r.id}>
                  <summary>
                    {r.service.title} · {translate(r.status)} ·{" "}
                    {money(r.quotedPrice)}
                  </summary>
                  <p>{r.brief}</p>
                  {r.projectId && (
                    <Link
                      className="text-link"
                      href={`/project-brief/${r.projectId}`}
                    >
                      Redizaynı və otaq şəkillərini aç
                    </Link>
                  )}
                  <p>{r.contact}</p>
                  {r.commission && (
                    <p>Qeydə alınmış komissiya: {money(r.commission.amount)}</p>
                  )}
                  {["COMPLETED", "CANCELLED"].includes(r.status) ? (
                    <p>{r.reply}</p>
                  ) : (
                    <DataForm
                      endpoint="designer/requests"
                      extra={{ requestId: r.id }}
                      fields={[
                        {
                          name: "status",
                          label: "Status",
                          options: statuses,
                          value: r.status,
                        },
                        field(
                          "reply",
                          "Cavab",
                          r.reply || "",
                          "textarea",
                          false,
                        ),
                      ]}
                    />
                  )}
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  if (section !== "admin") return null;
  const [
    users,
    stores,
    designers,
    products,
    plans,
    payments,
    reports,
    audits,
    jobs,
    events,
    orders,
    subscriptions,
    setting,
  ] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        wallet: { select: { balance: true } },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.store.findMany({ take: 100 }),
    db.designerProfile.findMany({ take: 100 }),
    db.product.findMany({
      include: { store: true, images: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.subscriptionPlan.findMany(),
    db.payment.findMany({
      include: { user: { select: { email: true } }, plan: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.report.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({
      include: { actor: { select: { email: true } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.designGeneration.findMany({
      include: { project: { select: { title: true } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.analyticsEvent.groupBy({ by: ["kind"], _count: true }),
    db.order.findMany({
      include: { store: true, images: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      include: { user: { select: { email: true } }, plan: true },
      take: 100,
    }),
    db.systemSetting.findUnique({ where: { key: "commissionRate" } }),
  ]);
  const [commissionTotal, adminOrders, adminCompleted] = await Promise.all([
    db.commission.aggregate({ _sum: { amount: true } }),
    db.order.count(),
    db.order.aggregate({
      where: { status: "COMPLETED" },
      _count: true,
      _sum: { total: true },
    }),
  ]);
  const contacts = await db.analyticsEvent.findMany({
    where: { kind: "CONTACT_MESSAGE" },
    take: 100,
    orderBy: { createdAt: "desc" },
  });
  const planFields = (p?: (typeof plans)[number]): Field[] => [
    field("name", "Plan adı", p?.name),
    {
      name: "role",
      label: "Hesab növü",
      options: roles.filter((r) => r.value !== "ADMIN"),
      value: p?.role || "CUSTOMER",
    },
    field("price", "Qiymət · AZN", p ? Number(p.price) : 0, "number"),
    field("credits", "Kreditlər", p?.credits || 0, "number"),
    field("durationDays", "Müddət · gün", p?.durationDays || 30, "number"),
    field("active", "Aktiv", p?.active ?? true, "checkbox", false),
    field(
      "sample",
      "Nümunə kommersiya şərtləri",
      p?.sample ?? true,
      "checkbox",
      false,
    ),
  ];
  return (
    <div className="stack">
      <div className="panel">
        <h2>Platforma qeydləri</h2>
        <p>
          Bütün dövr üzrə sifariş sorğuları: {adminOrders} · tamamlanan:{" "}
          {adminCompleted._count} · tamamlanan sifarişlərin məbləği:{" "}
          {money(adminCompleted._sum.total || 0)}
        </p>
        <AnalyticsChart
          title="Platforma hadisələri · bütün dövr"
          data={events.map((e) => ({
            name: translate(e.kind),
            count: e._count,
          }))}
        />
        <p>
          Siyahılar son 100 qeydlə məhdudlaşdırılıb. Hadisə sayları bütün
          qeydləri əhatə edir.
        </p>
        <div className="grid-2">
          {events.map((e) => (
            <p key={e.kind}>
              {translate(e.kind)}: <strong>{e._count}</strong>
            </p>
          ))}
        </div>
        <p>
          Qeydə alınan komissiya (bütün dövr):{" "}
          {money(commissionTotal._sum.amount || 0)}
        </p>
      </div>
      <div className="panel">
        <h2>İstifadəçilər və kreditlər</h2>
        {users.map((u) => (
          <details key={u.id}>
            <summary>
              {u.name} · {u.email} · {translate(u.role)} ·{" "}
              {u.wallet?.balance || 0} kredit
            </summary>
            {u.id === user.id ? (
              <p>Aktiv admin hesabı qorunur.</p>
            ) : (
              <AdminForm
                action="user"
                targetId={u.id}
                fields={[
                  { name: "role", label: "Rol", options: roles, value: u.role },
                  field(
                    "disabled",
                    "Hesabı deaktiv et",
                    u.disabled,
                    "checkbox",
                    false,
                  ),
                ]}
              />
            )}
            <AdminForm
              action="credits"
              targetId={u.id}
              fields={[
                field(
                  "amount",
                  "Kredit dəyişikliyi (mənfi rəqəm çıxır)",
                  0,
                  "number",
                ),
                field("reason", "Səbəb", undefined, "textarea"),
              ]}
            />
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>Mağaza və dizayner təsdiqləri</h2>
        {stores.map((s) => (
          <details key={s.id}>
            <summary>
              Mağaza: {s.name} · {translate(s.approval)}
            </summary>
            <p>
              {s.description} · {s.address} · {s.phone} · {s.email}
            </p>
            <AdminForm
              action="store"
              targetId={s.id}
              fields={[
                {
                  name: "approval",
                  label: "Qərar",
                  options: approvals,
                  value: s.approval,
                },
              ]}
            />
          </details>
        ))}
        {designers.map((d) => (
          <details key={d.id}>
            <summary>
              Dizayner: {d.displayName} · {translate(d.approval)}
            </summary>
            <p>{d.bio}</p>
            <AdminForm
              action="designer"
              targetId={d.id}
              fields={[
                {
                  name: "approval",
                  label: "Qərar",
                  options: approvals,
                  value: d.approval,
                },
              ]}
            />
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>Məhsul moderasiyası</h2>
        {products.map((p) => (
          <details key={p.id}>
            <summary>
              {p.name} · {p.store.name} · {translate(p.status)}
            </summary>
            <p>{p.description}</p>
            <div className="actions">
              {p.images.map((image) => (
                <img
                  key={image.id}
                  src={
                    image.assetId
                      ? `/api/images/${image.assetId}`
                      : image.url || ""
                  }
                  width={150}
                  height={110}
                  alt={image.alt}
                />
              ))}
            </div>
            <AdminForm
              action="product"
              targetId={p.id}
              fields={[
                {
                  name: "status",
                  label: "Status",
                  options: options([
                    "PENDING",
                    "ACTIVE",
                    "REJECTED",
                    "ARCHIVED",
                  ]),
                  value: p.status,
                },
              ]}
            />
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>Planlar</h2>
        <details>
          <summary>Yeni plan</summary>
          <AdminForm action="plan" targetId="new" fields={planFields()} />
        </details>
        {plans.map((p) => (
          <details key={p.id}>
            <summary>
              {p.name} · {money(p.price)}
            </summary>
            <AdminForm action="plan" targetId={p.id} fields={planFields(p)} />
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>Əl ilə ödəniş yoxlaması</h2>
        <p>
          Yalnız faktiki ödəniş sübutunu yoxladıqdan sonra təsdiqləyin. Təsdiq
          kredit və abunəlik yaradır.
        </p>
        {payments.map((p) => (
          <details key={p.id}>
            <summary>
              {p.user.email} · {p.plan.name} · {money(p.amount)} ·{" "}
              {translate(p.status)}
            </summary>
            <p>
              {p.id} · {p.provider} · {p.providerReference || "İstinad yoxdur"}
            </p>
            {p.status === "PENDING" && (
              <AdminForm
                action="payment"
                targetId={p.id}
                fields={[
                  {
                    name: "status",
                    label: "Qərar",
                    options: options(["REJECTED", "CONFIRMED"]),
                    value: "REJECTED",
                  },
                  field("reference", "Bank və ya yoxlama istinadı"),
                ]}
              />
            )}
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>Komissiya parametri</h2>
        <AdminForm
          action="setting"
          targetId="commissionRate"
          fields={[
            field(
              "value",
              "Komissiya faizi",
              Number(setting?.value || 0),
              "number",
            ),
          ]}
        />
      </div>
      <div className="panel">
        <h2>Şikayətlər</h2>
        {!reports.length && <Empty />}
        {reports.map((r) => (
          <details key={r.id}>
            <summary>
              {r.targetType} · {r.targetId} ·{" "}
              {r.resolved ? "Həll olunub" : "Açıq"}
            </summary>
            <p>{r.reason}</p>
            <AdminForm
              action="report"
              targetId={r.id}
              fields={[
                field("resolved", "Həll olunub", r.resolved, "checkbox", false),
              ]}
            />
          </details>
        ))}
      </div>
      <div className="panel">
        <h2>AI monitorinqi</h2>
        {!jobs.length && <Empty />}
        {jobs.map((j) => (
          <div className="list-row" key={j.id}>
            <div>
              <strong>{j.project.title}</strong>
              <p>
                {translate(j.status)} · {j.provider}/{j.model} · cəhd:{" "}
                {j.attempts} · {date(j.createdAt)}
              </p>
              {j.error && <p className="error">{j.error}</p>}
              <small>
                Təxmini xərc:{" "}
                {j.estimatedCostAzn
                  ? money(j.estimatedCostAzn)
                  : "qeydə alınmayıb"}{" "}
                · faktiki xərc:{" "}
                {j.actualCostAzn ? money(j.actualCostAzn) : "qeydə alınmayıb"}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Sifarişlər və abunəliklər</h2>
        {orders.map((o) => (
          <p key={o.id}>
            {o.id.slice(-8)} · {o.store.name} · {translate(o.status)} ·{" "}
            {money(o.total)}
          </p>
        ))}
        {subscriptions.map((s) => (
          <p key={s.id}>
            {s.user.email} · {s.plan.name} · {translate(s.status)} · bitmə:{" "}
            {date(s.expiresAt)}
          </p>
        ))}
      </div>
      <div className="panel">
        <h2>Əlaqə mesajları</h2>
        {!contacts.length && <Empty />}
        {contacts.map((c) => (
          <div key={c.id} className="list-row">
            <div>
              <small>{date(c.createdAt)}</small>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {JSON.stringify(c.metadata, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Audit jurnalı</h2>
        {!audits.length && <Empty />}
        {audits.map((a) => (
          <details key={a.id}>
            <summary>
              {date(a.createdAt)} · {a.actor.email} · {a.action}
            </summary>
            <p>{a.targetId}</p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(a.metadata, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}
