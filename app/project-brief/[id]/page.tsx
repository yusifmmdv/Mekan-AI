/* eslint-disable @next/next/no-img-element -- Authorized private project images. */
import { notFound } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectAudience } from "@/lib/project-access";
import { money } from "@/lib/config";
export const metadata = {
  title: "Redizayn layihəsi",
  robots: { index: false, follow: false },
};
export default async function ProjectBrief({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await pageUser();
  const { id } = await params;
  const project = await db.designProject.findFirst({
    where: { id, ...projectAudience(user.id) },
    include: {
      generations: {
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });
  if (!project) notFound();
  return (
    <div className="container section">
      <div className="page-title">
        <div className="eyebrow">İcra üçün layihə brifi</div>
        <h1>{project.title}</h1>
        <p>
          {project.spaceType} · {project.style} · Təxmini büdcə{" "}
          {money(project.budget)}
        </p>
      </div>
      <div className="panel">
        <h2>Müştərinin istəkləri</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{project.requirements}</p>
        <p>
          Ölçülər təxminidir. Xüsusi mebelin texniki ölçüləri, materialları,
          qiyməti və icra imkanı mütəxəssis tərəfindən təsdiqlənməlidir.
        </p>
      </div>
      <h2 style={{ marginTop: 30 }}>Məkanın görünüşləri</h2>
      <div className="grid-3">
        {[project.imageId, ...project.galleryIds].map((assetId) => (
          <img
            key={assetId}
            src={`/api/images/${assetId}`}
            alt="Məkanın orijinal görünüşü"
            width={600}
            height={450}
          />
        ))}
      </div>
      <h2 style={{ marginTop: 30 }}>AI redizayn konseptləri</h2>
      <div className="grid-2">
        {project.generations
          .filter((g) => g.outputImageId)
          .map((g) => (
            <img
              key={g.id}
              src={`/api/images/${g.outputImageId}`}
              alt="AI vizual konsepti, icra planı deyil"
              width={800}
              height={600}
            />
          ))}
      </div>
    </div>
  );
}
