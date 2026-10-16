-- CreateTable
CREATE TABLE "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "actorName" VARCHAR(160),
    "actorEmail" VARCHAR(255),
    "actorRole" VARCHAR(40),
    "module" VARCHAR(40) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "method" VARCHAR(10),
    "path" VARCHAR(500),
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "targetType" VARCHAR(40),
    "targetId" VARCHAR(100),
    "targetLabel" VARCHAR(300),
    "metadata" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_module_createdAt_idx" ON "activity_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_ipAddress_idx" ON "activity_logs"("ipAddress");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

