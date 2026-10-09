import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, stores, designers] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", store: { approval: "APPROVED" } },
      select: { slug: true, updatedAt: true },
    }),
    db.store.findMany({
      where: { approval: "APPROVED" },
      select: { slug: true, updatedAt: true },
    }),
    db.designerProfile.findMany({
      where: { approval: "APPROVED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  return [
    ...[
      "",
      "/how-it-works",
      "/studio",
      "/examples",
      "/marketplace",
      "/stores",
      "/designers",
      "/realtors",
      "/pricing",
      "/about",
      "/contact",
      "/faq",
      "/privacy",
      "/terms",
    ].map((p) => ({ url: appUrl + p })),
    ...products.map((p) => ({
      url: `${appUrl}/marketplace/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...stores.map((p) => ({
      url: `${appUrl}/stores/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...designers.map((p) => ({
      url: `${appUrl}/designers/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
