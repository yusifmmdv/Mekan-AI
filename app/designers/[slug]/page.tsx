/* eslint-disable @next/next/no-img-element -- Private images require browser session cookies; storage already resizes and converts to WebP. */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DataForm } from "@/components/actions";
import { money } from "@/lib/config";
export default async function Designer({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await db.designerProfile.findFirst({
    where: { slug, approval: "APPROVED" },
    include: {
      services: { where: { active: true } },
      portfolio: true,
      requests: {
        where: { status: "COMPLETED", review: { isNot: null } },
        include: { review: true },
        take: 20,
      },
    },
  });
  if (!d) notFound();
  return (
    <div className="container">
      <div className="page-title">
        {d.demo && <span className="badge">Demo profil</span>}
        <h1 style={{ marginTop: 15 }}>{d.displayName}</h1>
        <p>
          {d.city} ·{" "}
          {d.available
            ? "Yeni layihələrə açıqdır"
            : "Hazırda yeni layihə qəbul etmir"}
        </p>
        <p>{d.bio}</p>
      </div>
      {d.portfolio.length > 0 && (
        <section className="section">
          <h2>Portfolio</h2>
          <div className="grid-3" style={{ marginTop: 25 }}>
            {d.portfolio.map((p) => (
              <div key={p.id}>
                <img
                  src={`/api/images/${p.assetId}`}
                  alt={p.title}
                  width="500"
                  height="350"
                />
                <h3>{p.title}</h3>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <div className="section-head">
          <h2>Xidmətlər</h2>
        </div>
        <div className="grid-2">
          {d.services.map((s) => (
            <div className="panel" key={s.id}>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <h3 style={{ margin: "20px 0" }}>{money(s.price)}</h3>
              {d.available && (
                <DataForm
                  endpoint="designer-request"
                  extra={{ serviceId: s.id }}
                  fields={[
                    {
                      name: "brief",
                      label: "Layihəniz haqqında",
                      type: "textarea",
                      required: true,
                    },
                    {
                      name: "contact",
                      label: "Əlaqə məlumatı",
                      required: true,
                    },
                  ]}
                  submit="Dizaynerə sorğu göndər"
                />
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Təsdiqlənmiş xidmət rəyləri</h2>
        {d.requests.length ? (
          d.requests.map((r) => (
            <div className="list-row" key={r.id}>
              <p>
                {r.review?.rating}/5 · {r.review?.text}
              </p>
            </div>
          ))
        ) : (
          <p style={{ marginTop: 25 }}>
            Hələ tamamlanmış xidmətlərdən rəy yoxdur.
          </p>
        )}
      </section>
    </div>
  );
}
