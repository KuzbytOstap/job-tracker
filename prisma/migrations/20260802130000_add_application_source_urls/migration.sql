-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
