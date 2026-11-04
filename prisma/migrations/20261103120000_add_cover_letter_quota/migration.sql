-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'COVER_LETTER';

-- AlterTable
ALTER TABLE "AiGlobalLimits" ADD COLUMN     "coverLetterGenerationLimit" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "AiUserLimit" ADD COLUMN     "coverLetterGenerationLimit" INTEGER;

-- AlterTable
ALTER TABLE "AiUsageDaily" ADD COLUMN     "coverLetterGenerationCount" INTEGER NOT NULL DEFAULT 0;
