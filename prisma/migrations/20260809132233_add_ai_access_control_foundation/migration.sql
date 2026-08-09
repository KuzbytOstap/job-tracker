-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AiAccessStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('VACANCY_GENERATION', 'HR_GENERATION');

-- CreateEnum
CREATE TYPE "AiRequestType" AS ENUM ('AI_ACCESS', 'VACANCY_LIMIT', 'HR_LIMIT', 'TOKEN_LIMIT');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiAccessStatus" "AiAccessStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "AiGlobalLimits" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "vacancyGenerationLimit" INTEGER NOT NULL DEFAULT 10,
    "hrGenerationLimit" INTEGER NOT NULL DEFAULT 10,
    "tokenLimit" INTEGER NOT NULL DEFAULT 20000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGlobalLimits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AiGlobalLimits_id_check" CHECK ("id" = 1)
);

-- CreateTable
CREATE TABLE "AiUserLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vacancyGenerationLimit" INTEGER,
    "hrGenerationLimit" INTEGER,
    "tokenLimit" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUserLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "vacancyGenerationCount" INTEGER NOT NULL DEFAULT 0,
    "hrGenerationCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "vacancyGenerationBonus" INTEGER NOT NULL DEFAULT 0,
    "hrGenerationBonus" INTEGER NOT NULL DEFAULT 0,
    "tokenBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiRequestType" NOT NULL,
    "status" "AiRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionNote" TEXT,
    "grantedAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiUserLimit_userId_key" ON "AiUserLimit"("userId");

-- CreateIndex
CREATE INDEX "AiUsageDaily_date_idx" ON "AiUsageDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageDaily_userId_date_key" ON "AiUsageDaily"("userId", "date");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_idx" ON "AiUsageEvent"("userId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_feature_idx" ON "AiUsageEvent"("userId", "feature");

-- CreateIndex
CREATE INDEX "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_applicationId_idx" ON "AiUsageEvent"("applicationId");

-- CreateIndex
CREATE INDEX "AiAccessRequest_userId_idx" ON "AiAccessRequest"("userId");

-- CreateIndex
CREATE INDEX "AiAccessRequest_status_idx" ON "AiAccessRequest"("status");

-- CreateIndex
CREATE INDEX "AiAccessRequest_userId_type_status_idx" ON "AiAccessRequest"("userId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiAccessRequest_userId_type_key" ON "AiAccessRequest"("userId", "type") WHERE ("status" = 'PENDING');

-- AddForeignKey
ALTER TABLE "AiUserLimit" ADD CONSTRAINT "AiUserLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageDaily" ADD CONSTRAINT "AiUsageDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAccessRequest" ADD CONSTRAINT "AiAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAccessRequest" ADD CONSTRAINT "AiAccessRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

