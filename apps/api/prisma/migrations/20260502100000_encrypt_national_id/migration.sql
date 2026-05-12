-- DropIndex
DROP INDEX IF EXISTS "User_nationalId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationalIdHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_nationalIdHash_key" ON "User"("nationalIdHash");
