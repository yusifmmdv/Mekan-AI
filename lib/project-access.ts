import { db } from "./db";
export function projectAudience(userId: string) {
  return {
    OR: [
      { userId },
      { inquiries: { some: { store: { ownerId: userId } } } },
      { serviceRequests: { some: { designer: { userId } } } },
    ],
  };
}
export async function canReadProjectAsset(userId: string, assetId: string) {
  return !!(await db.designProject.findFirst({
    where: {
      AND: [
        projectAudience(userId),
        {
          OR: [
            { imageId: assetId },
            { galleryIds: { has: assetId } },
            {
              generations: {
                some: { outputImageId: assetId, status: "SUCCEEDED" },
              },
            },
          ],
        },
      ],
    },
    select: { id: true },
  }));
}
