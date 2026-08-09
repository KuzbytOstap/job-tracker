-- AlterTable
ALTER TABLE "AiAccessRequest" ADD COLUMN     "quotaDate" DATE;

-- Backfill
UPDATE "AiAccessRequest"
SET "quotaDate" = "createdAt"::date
WHERE "type" IN ('VACANCY_LIMIT', 'HR_LIMIT', 'TOKEN_LIMIT');

-- DropIndex
DROP INDEX "AiAccessRequest_userId_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "AiAccessRequest_userId_type_key" ON "AiAccessRequest"("userId", "type") WHERE ("status" = 'PENDING' AND "type" = 'AI_ACCESS');

-- CreateIndex
CREATE UNIQUE INDEX "AiAccessRequest_userId_type_quotaDate_key" ON "AiAccessRequest"("userId", "type", "quotaDate") WHERE ("status" = 'PENDING');
