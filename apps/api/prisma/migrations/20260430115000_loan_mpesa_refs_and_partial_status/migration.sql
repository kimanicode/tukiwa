ALTER TYPE "LoanStatus" ADD VALUE 'PARTIALLY_REPAID';

ALTER TABLE "Loan" ADD COLUMN "disbursementRef" TEXT;

CREATE UNIQUE INDEX "Loan_disbursementRef_key" ON "Loan"("disbursementRef");
CREATE UNIQUE INDEX "LoanRepayment_mpesaRef_key" ON "LoanRepayment"("mpesaRef");
