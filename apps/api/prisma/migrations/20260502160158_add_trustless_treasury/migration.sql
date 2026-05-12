-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('LOAN_DISBURSEMENT', 'ROTATION_PAYOUT', 'INVESTMENT_PURCHASE', 'MANUAL_TRANSFER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTING', 'EXECUTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "LoanStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "ChamaSettings" ADD COLUMN     "proposalThresholdCents" INTEGER NOT NULL DEFAULT 500000,
ADD COLUMN     "requiredApprovals" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "treasuryEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChamaSignatory" (
    "id" TEXT NOT NULL,
    "chamaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "ChamaSignatory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TxProposal" (
    "id" TEXT NOT NULL,
    "chamaId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredApprovals" INTEGER NOT NULL,
    "totalSignatories" INTEGER NOT NULL,
    "executedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "mpesaRef" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TxProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TxProposalApproval" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "signatoryId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "reason" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceMeta" JSONB,

    CONSTRAINT "TxProposalApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChamaSignatory_chamaId_idx" ON "ChamaSignatory"("chamaId");

-- CreateIndex
CREATE INDEX "ChamaSignatory_userId_idx" ON "ChamaSignatory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChamaSignatory_chamaId_userId_key" ON "ChamaSignatory"("chamaId", "userId");

-- CreateIndex
CREATE INDEX "TxProposal_chamaId_idx" ON "TxProposal"("chamaId");

-- CreateIndex
CREATE INDEX "TxProposal_proposedBy_idx" ON "TxProposal"("proposedBy");

-- CreateIndex
CREATE INDEX "TxProposal_status_idx" ON "TxProposal"("status");

-- CreateIndex
CREATE INDEX "TxProposal_referenceId_idx" ON "TxProposal"("referenceId");

-- CreateIndex
CREATE INDEX "TxProposalApproval_proposalId_idx" ON "TxProposalApproval"("proposalId");

-- CreateIndex
CREATE INDEX "TxProposalApproval_signatoryId_idx" ON "TxProposalApproval"("signatoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TxProposalApproval_proposalId_signatoryId_key" ON "TxProposalApproval"("proposalId", "signatoryId");

-- AddForeignKey
ALTER TABLE "ChamaSignatory" ADD CONSTRAINT "ChamaSignatory_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChamaSignatory" ADD CONSTRAINT "ChamaSignatory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxProposal" ADD CONSTRAINT "TxProposal_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxProposal" ADD CONSTRAINT "TxProposal_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxProposalApproval" ADD CONSTRAINT "TxProposalApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TxProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxProposalApproval" ADD CONSTRAINT "TxProposalApproval_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
