CREATE TYPE "PlatformReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CustomPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "PlatformReviewStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPlatform_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobApplication" ADD COLUMN     "customPlatformId" TEXT;

CREATE INDEX "CustomPlatform_isGlobal_normalizedName_idx" ON "CustomPlatform"("isGlobal", "normalizedName");

CREATE INDEX "CustomPlatform_reviewStatus_idx" ON "CustomPlatform"("reviewStatus");

CREATE UNIQUE INDEX "CustomPlatform_ownerId_normalizedName_key" ON "CustomPlatform"("ownerId", "normalizedName");

CREATE INDEX "JobApplication_customPlatformId_idx" ON "JobApplication"("customPlatformId");

ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_customPlatformId_fkey" FOREIGN KEY ("customPlatformId") REFERENCES "CustomPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomPlatform" ADD CONSTRAINT "CustomPlatform_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomPlatform" ADD CONSTRAINT "CustomPlatform_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
