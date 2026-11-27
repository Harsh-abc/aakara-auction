import { z } from "zod";
import { SETTING_KEYS } from "../libs/notificationSettings.js";

// PATCH /api/admin/notification-settings — one switch at a time
export const updateNotificationSettingSchema = z.object({
    key: z.enum(SETTING_KEYS, { message: "Unknown notification setting" }),
    enabled: z.boolean({ message: "enabled must be true or false" }),
});
