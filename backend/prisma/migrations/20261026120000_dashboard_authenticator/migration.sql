-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" BIGINT;

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "mfaVerifiedAt" TIMESTAMP(3);
