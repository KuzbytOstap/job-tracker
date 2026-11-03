-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'FIT_ANALYSIS';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "fitAnalysis" JSONB,
ADD COLUMN     "fitAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "fitMismatchCount" INTEGER;

-- AlterTable
ALTER TABLE "AiGlobalLimits" ADD COLUMN     "fitAnalysisGenerationLimit" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "AiUserLimit" ADD COLUMN     "fitAnalysisGenerationLimit" INTEGER;

-- AlterTable
ALTER TABLE "AiUsageDaily" ADD COLUMN     "fitAnalysisGenerationCount" INTEGER NOT NULL DEFAULT 0;
