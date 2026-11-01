ALTER TABLE "JobApplication" ADD COLUMN     "reviewReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "suggestedPlatformName" TEXT;
