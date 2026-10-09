ALTER TABLE "DesignProject" ADD COLUMN "galleryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "spaceType" TEXT NOT NULL DEFAULT 'HOME';
ALTER TABLE "Inquiry" ADD COLUMN "projectId" TEXT REFERENCES "DesignProject"("id") ON DELETE RESTRICT;
ALTER TABLE "DesignerRequest" ADD COLUMN "projectId" TEXT REFERENCES "DesignProject"("id") ON DELETE RESTRICT;
CREATE INDEX "Inquiry_projectId_idx" ON "Inquiry"("projectId");
CREATE INDEX "DesignerRequest_projectId_idx" ON "DesignerRequest"("projectId");
