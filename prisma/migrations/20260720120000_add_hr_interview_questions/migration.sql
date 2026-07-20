-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN "hrInterviewQuestions" JSONB,
ADD COLUMN "hrQuestionsGeneratedAt" TIMESTAMP(3);
