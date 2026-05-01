-- CreateEnum
CREATE TYPE "FeeTransactionType" AS ENUM ('CONTRIBUTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'ROTATION_PAYOUT');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'SETTLED', 'WAIVED', 'FAILED');

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "feeAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "feeAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "transactionType" "FeeTransactionType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "feeRate" DOUBLE PRECISION NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "chamaId" TEXT NOT NULL,
    "memberId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformFee_chamaId_idx" ON "PlatformFee"("chamaId");

-- CreateIndex
CREATE INDEX "PlatformFee_referenceId_idx" ON "PlatformFee"("referenceId");

-- CreateIndex
CREATE INDEX "PlatformFee_status_idx" ON "PlatformFee"("status");

-- CreateIndex
CREATE INDEX "PlatformFee_transactionType_idx" ON "PlatformFee"("transactionType");

-- AddForeignKey
ALTER TABLE "PlatformFee" ADD CONSTRAINT "PlatformFee_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
