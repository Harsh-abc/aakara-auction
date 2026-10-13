-- AlterTable
ALTER TABLE "users" ADD COLUMN     "roleChangedAt" TIMESTAMP(3),
ADD COLUMN     "roleChangedById" BIGINT;

-- CreateIndex
CREATE INDEX "users_roleChangedById_idx" ON "users"("roleChangedById");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleChangedById_fkey" FOREIGN KEY ("roleChangedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Accounts a super admin created already got their role from that admin
UPDATE "users"
SET "roleChangedById" = "createdById",
    "roleChangedAt" = "createdAt"
WHERE "createdById" IS NOT NULL;
