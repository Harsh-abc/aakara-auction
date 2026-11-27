import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type { NotificationSettingKey, NotificationSettings } from "@/lib/types/notificationSetting.types"

const { NOTIFICATION_SETTINGS_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

export async function getNotificationSettings(token: string | null): Promise<NotificationSettings> {
    const response = await apiConnector({ method: "GET", url: NOTIFICATION_SETTINGS_API, header: authHeader(token) })
    return response.data.data
}

/** Turns one channel or notification on / off; resolves to the server's message and the saved settings */
export async function setNotificationSetting(
    token: string | null,
    key: NotificationSettingKey,
    enabled: boolean
): Promise<{ message: string; settings: NotificationSettings }> {
    const response = await apiConnector({
        method: "PATCH",
        url: NOTIFICATION_SETTINGS_API,
        body: { key, enabled },
        header: authHeader(token),
    })
    return { message: response.data.message, settings: response.data.data }
}
