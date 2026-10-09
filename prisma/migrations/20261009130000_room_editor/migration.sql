CREATE TABLE "RoomDesign" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "backgroundImageId" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "backgroundKind" TEXT NOT NULL DEFAULT 'ORIGINAL',
 "scene" JSONB NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RoomDesign_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RoomDesign_backgroundKind_check" CHECK ("backgroundKind" IN ('ORIGINAL','AI')),
 CONSTRAINT "RoomDesign_version_check" CHECK ("version" > 0)
);
CREATE INDEX "RoomDesign_userId_updatedAt_idx" ON "RoomDesign"("userId", "updatedAt");
ALTER TABLE "RoomDesign" ADD CONSTRAINT "RoomDesign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomDesign" ADD CONSTRAINT "RoomDesign_backgroundImageId_fkey" FOREIGN KEY ("backgroundImageId") REFERENCES "ImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
