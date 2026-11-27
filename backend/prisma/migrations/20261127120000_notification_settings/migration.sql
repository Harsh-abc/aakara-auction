-- Settings → Notifications: on / off switches for user emails and SMS.
-- No row = on, so every notification keeps sending until someone switches it off.

-- CreateTable
CREATE TABLE "notification_settings" (
    "key" VARCHAR(60) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedByName" VARCHAR(160),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("key")
);
