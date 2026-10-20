-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('PREVIEW', 'APPLY');

-- AlterTable
ALTER TABLE "mapping_proposals" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "sync_runs" ADD COLUMN     "mode" "SyncMode" NOT NULL DEFAULT 'APPLY',
ADD COLUMN     "previewItems" JSONB,
ADD COLUMN     "previewTruncated" BOOLEAN NOT NULL DEFAULT false;
