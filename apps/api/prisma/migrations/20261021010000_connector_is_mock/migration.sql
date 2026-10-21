-- AlterTable
ALTER TABLE "connectors" ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false;

-- The seeded systems that HuiTong's mocks stand in for, so a database migrated
-- without re-seeding never shows a mock as a live integration.
UPDATE "connectors" SET "isMock" = true WHERE "id" IN ('sg-hr', 'cn-hq', 'oa', 'teams', 'dingtalk');
