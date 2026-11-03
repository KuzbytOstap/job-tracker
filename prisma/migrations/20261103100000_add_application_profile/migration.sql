-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOUR', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

-- CreateEnum
CREATE TYPE "WorkFormat" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ProfileContextWeight" AS ENUM ('COVERED', 'SUBSTANTIAL', 'MINOR');

-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'PROFILE';

-- AlterTable
ALTER TABLE "AiGlobalLimits" ADD COLUMN     "profileGenerationLimit" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "AiUserLimit" ADD COLUMN     "profileGenerationLimit" INTEGER;

-- AlterTable
ALTER TABLE "AiUsageDaily" ADD COLUMN     "profileGenerationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "contactEmail" TEXT,
    "phone" TEXT,
    "addressStreet" TEXT,
    "addressPostalCode" TEXT,
    "addressCity" TEXT,
    "addressRegion" TEXT,
    "addressCountry" TEXT,
    "salaryAmount" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" "SalaryPeriod",
    "employmentTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
    "workFormats" "WorkFormat"[] DEFAULT ARRAY[]::"WorkFormat"[],
    "coverLetterPrompt" TEXT,
    "cvHintSnoozedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCv" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "language" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileContextItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "weight" "ProfileContextWeight",
    "impact" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileContextItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetterExample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vacancyText" TEXT NOT NULL,
    "letterText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetterExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserCv_userId_idx" ON "UserCv"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCv_userId_primary_key" ON "UserCv"("userId") WHERE ("isPrimary" = true);

-- CreateIndex
CREATE INDEX "ProfileContextItem_userId_idx" ON "ProfileContextItem"("userId");

-- CreateIndex
CREATE INDEX "CoverLetterExample_userId_idx" ON "CoverLetterExample"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCv" ADD CONSTRAINT "UserCv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContextItem" ADD CONSTRAINT "ProfileContextItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetterExample" ADD CONSTRAINT "CoverLetterExample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
