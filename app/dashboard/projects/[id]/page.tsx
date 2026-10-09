/* eslint-disable @next/next/no-img-element -- Private images require browser session cookies; storage already resizes and converts to WebP. */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { money, roomLabels, styleLabels, aiConfigured } from "@/lib/config";
import { Comparison, GenerationControl } from "@/components/actions";
import { recommendProducts } from "@/lib/recommendations";
import { ProductCard, productInclude } from "@/components/catalog";
import Link from "next/link";
import { ProjectHandoff } from "@/components/project-handoff";
export default async function Project({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await pageUser();
  const p = await db.designProject.findFirst({
    where: { id, userId: u.id },
    include: {
      generations: { orderBy: { createdAt: "desc" } },
      staging: { include: { property: true } },
    },
  });
  if (!p) notFound();
  const result = p.generations.find(
    (g) => g.status === "SUCCEEDED" && g.outputImageId,
  );
  const candidates = await db.product.findMany({
    where: {
      status: "ACTIVE",
      store: { approval: "APPROVED" },
      stock: { gt: 0 },
      roomTypes: { has: p.roomType },
      OR: [
        { discountPrice: { lte: p.budget } },
        { discountPrice: null, price: { lte: p.budget } },
      ],
    },
    include: productInclude,
    take: 150,
  });
  const recommendations = recommendProducts(candidates, {
    roomType: p.roomType,
    style: p.style,
    budget: Number(p.budget),
    colors: p.colors,
    width: p.width,
    length: p.length,
  });
  return (
    <>
      <div className="dashboard-title">
        <div>
          <h1>{p.title}</h1>
          <p>
            {roomLabels[p.roomType]} · {styleLabels[p.style]} · {p.width} ×{" "}
            {p.length} m · {money(p.budget)}
          </p>
          {p.staging && (
            <span className="badge">
              Virtual səhnələşdirmə · {p.staging.property.title}
            </span>
          )}
        </div>
        <span className="badge">{u.wallet?.balance || 0} kredit</span>
      </div>
      {!aiConfigured() && (
        <div className="notice">
          AI xidməti konfiqurasiya edilməyib. Şəkliniz və layihəniz saxlanılıb.
          Lokal AI xidmətini işə salın; ödənişli API tələb olunmur.
        </div>
      )}
      <div className="actions" style={{ marginBottom: 22 }}>
        <Link
          href={`/room-editor?imageId=${p.imageId}`}
          className="btn secondary"
        >
          Otaqda mebel yerləşdir · 2D redaktor
        </Link>
        {result?.outputImageId && (
          <Link
            href={`/room-editor?imageId=${result.outputImageId}`}
            className="text-link"
          >
            AI nəticəsinə 2D qatlar əlavə et
          </Link>
        )}
      </div>
      {result?.outputImageId ? (
        <Comparison
          before={`/api/images/${p.imageId}`}
          after={`/api/images/${result.outputImageId}`}
        />
      ) : (
        <div className="panel">
          <img
            src={`/api/images/${p.imageId}`}
            alt="Original otaq şəkli"
            width="1000"
            height="650"
            style={{ width: "100%", maxHeight: 450, objectFit: "contain" }}
          />
        </div>
      )}
      <div className="panel" style={{ marginTop: 25 }}>
        <h2>Generasiya və tarixçə</h2>
        <p style={{ marginBottom: 20 }}>
          AI vizualizasiyasıdır. Ölçülər və konkret satış mebelləri ilə eynilik
          zəmanəti verilmir.
        </p>
        <GenerationControl
          creditCost={process.env.AI_PROVIDER === "local" ? 0 : 1}
          projectId={p.id}
          initial={p.generations.map((g) => ({
            id: g.id,
            status: g.status,
            error: g.error,
            outputImageId: g.outputImageId,
          }))}
        />
        {p.generations
          .filter((g) => g.outputImageId)
          .map((g) => (
            <details key={g.id} style={{ marginTop: 18 }}>
              <summary>
                {g.createdAt.toLocaleString("az-AZ")} · AI vizualizasiya{" "}
                {p.staging ? "· Virtual staging" : ""}
              </summary>
              <img
                src={`/api/images/${g.outputImageId}`}
                alt="Saxlanmış AI interyer dizaynı"
                width="900"
                height="600"
              />
            </details>
          ))}
      </div>
      <section className="section">
        <div className="panel">
          <div className="eyebrow">Bütöv məkan redizaynı</div>
          <h2>Layihə brifi</h2>
          <p>
            {
              (
                {
                  HOME: "Ev / mənzil",
                  OFFICE: "Ofis",
                  STUDIO: "Studiya / iş məkanı",
                } as Record<string, string>
              )[p.spaceType]
            }{" "}
            · Divarlar, döşəmə, işıqlandırma və mebel
          </p>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 14 }}>
            {p.requirements}
          </p>
          <Link href={`/project-brief/${p.id}`} className="text-link">
            Bütün şəkilləri və konseptləri aç
          </Link>
        </div>
        {p.galleryIds.length > 0 && (
          <div className="grid-3" style={{ marginTop: 20 }}>
            {p.galleryIds.map((assetId) => (
              <img
                key={assetId}
                src={`/api/images/${assetId}`}
                alt="Məkanın əlavə görünüşü"
                width={500}
                height={375}
              />
            ))}
          </div>
        )}
      </section>
      <ProjectHandoff projectId={p.id} requirements={p.requirements} />
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Üslubunuza uyğun seçimlər</h2>
            <p>
              Real kataloqdan oxşar tövsiyələr. Şəkildəki mebellərin eyni məhsul
              olduğunu iddia etmirik. Büdcə hər məhsul üçün filtrdir; ümumi dəst
              qiyməti deyil.
            </p>
          </div>
        </div>
        {recommendations.length ? (
          <div className="grid-3">
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>Hazırda bu otaq və büdcə üçün uyğun məhsul yoxdur.</p>
          </div>
        )}
      </section>
    </>
  );
}
