// shapes returned by /api/admin/notification-settings (backend/src/libs/notificationSettings.js)

export type NotificationChannel = "EMAIL" | "SMS"

export type NotificationSwitch = {
    enabled: boolean
    updatedAt: string | null
    /** who last switched it; null = never changed (on by default) */
    updatedBy: string | null
}

export type NotificationChannelSetting = NotificationSwitch & {
    channel: NotificationChannel
    label: string
}

export type NotificationEventSetting = {
    event: string
    label: string
    description: string
    /** only the channels this notification is sent on */
    channels: Partial<Record<NotificationChannel, NotificationSwitch>>
}

export type NotificationSettings = {
    channels: NotificationChannelSetting[]
    events: NotificationEventSetting[]
    /** security / account messages that can't be switched off */
    alwaysSent: string[]
}

/** "EMAIL", "SMS" or "<EVENT>:<CHANNEL>" */
export type NotificationSettingKey = NotificationChannel | `${string}:${NotificationChannel}`
