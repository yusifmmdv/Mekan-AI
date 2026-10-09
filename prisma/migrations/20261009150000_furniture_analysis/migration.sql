ALTER TABLE "DesignGeneration" ADD COLUMN "analysisStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "analysisError" TEXT,
ADD COLUMN "analysisLockedAt" TIMESTAMP(3),
ADD COLUMN "analysis" JSONB;
