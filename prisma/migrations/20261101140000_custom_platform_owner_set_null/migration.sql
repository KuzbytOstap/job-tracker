ALTER TABLE "CustomPlatform" DROP CONSTRAINT "CustomPlatform_ownerId_fkey";

ALTER TABLE "CustomPlatform" ALTER COLUMN "ownerId" DROP NOT NULL;

ALTER TABLE "CustomPlatform" ADD CONSTRAINT "CustomPlatform_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
