-- AlterEnum
ALTER TYPE "MemberRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushToken" TEXT;
