-- AlterTable
ALTER TABLE "ChamaSettings" ADD COLUMN     "disputeResolutionMethod" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "meetingFrequency" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "memberExitPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recordVisibility" TEXT NOT NULL DEFAULT 'members_see_own_records',
ADD COLUMN     "refundPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "votingRule" TEXT NOT NULL DEFAULT 'simple_majority',
ADD COLUMN     "withdrawalPolicy" TEXT NOT NULL DEFAULT '';
