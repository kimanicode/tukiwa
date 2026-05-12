-- Add SPLIT fee status for fees collected externally by M-Pesa Split Payments.
ALTER TYPE "FeeStatus" ADD VALUE IF NOT EXISTS 'SPLIT';

-- Chama Paybill account references identify chama funds in one Tukiwa Paybill.
ALTER TABLE "Chama" ADD COLUMN "mpesaAccountRef" TEXT;

UPDATE "Chama"
SET "mpesaAccountRef" = LEFT(
  CONCAT(
    LEFT(COALESCE(NULLIF(REGEXP_REPLACE(UPPER("name"), '[^A-Z]', '', 'g'), ''), 'CHAMA'), 7),
    RIGHT(REPLACE("id", '-', ''), 4)
  ),
  12
)
WHERE "mpesaAccountRef" IS NULL;

ALTER TABLE "Chama" ALTER COLUMN "mpesaAccountRef" SET NOT NULL;
CREATE UNIQUE INDEX "Chama_mpesaAccountRef_key" ON "Chama"("mpesaAccountRef");

-- Store the M-Pesa BillRefNumber used for callback reconciliation.
ALTER TABLE "Contribution" ADD COLUMN "billRefNumber" TEXT;

-- Direct Paybill C2B payments can be reconciled to a chama even before
-- the payer is matched to an active member.
ALTER TABLE "Contribution" ALTER COLUMN "memberId" DROP NOT NULL;
