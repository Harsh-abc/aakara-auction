import { getActor } from "../libs/activityLog.js";
import { listNotificationSettings, setNotificationSetting, settingLabel } from "../libs/notificationSettings.js";
import { updateNotificationSettingSchema } from "../validations/notificationSetting.validation.js";

const handleError = (res, error, label, fallback) => {
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/admin/notification-settings — every email / SMS switch
// -----------------------------------------------------------------

export const getNotificationSettings = async (req, res) => {
    try {
        const data = await listNotificationSettings();
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Notification settings fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get notification settings", "Failed to fetch the notification settings");
    }
};

// -----------------------------------------------------------------
// PATCH /api/admin/notification-settings { key, enabled } — one switch
// -----------------------------------------------------------------

export const updateNotificationSetting = async (req, res) => {
    const parsed = updateNotificationSettingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid request" });
    }
    try {
        const { key, enabled } = parsed.data;
        const actor = await getActor({ id: req.user?.userId });
        await setNotificationSetting(key, enabled, actor?.name ?? actor?.email ?? null);
        return res.status(200).json({
            success: true,
            message: `${settingLabel(key)} ${enabled ? "turned on" : "paused"}`,
            data: await listNotificationSettings(),
        });
    } catch (error) {
        return handleError(res, error, "Update notification setting", "Failed to save the notification setting");
    }
};
