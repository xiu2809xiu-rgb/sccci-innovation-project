-- AlterTable
ALTER TABLE "sync_runs" ADD COLUMN     "changeDigest" TEXT,
ADD COLUMN     "previewRunId" TEXT;
