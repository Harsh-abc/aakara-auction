import prisma from "./prisma.js";

// =====================================================================
// Settings → Notifications: on / off switches for the emails and SMS that
// go to users because of something they did (or that happened to them).
//
// Two levels, both have to be on for a message to go out:
//   channel   "EMAIL" / "SMS" — the master switch for everything on it
//   event     "PROXY_BID_SET:SMS" — one notification on one channel
//
// Saved in the notification_settings table; no row = on.
//
// Security / account messages are never switched off here — sign-up and
// password-reset codes, a new team member's login details, and the KYC
// document request a staff member sends by hand. Pausing those would lock
// people out, so they don't call isNotificationEnabled.
// =====================================================================

export const CHANNELS = {
    EMAIL: { label: "Email", allLabel: "All emails" },
    SMS: { label: "SMS", allLabel: "All SMS" },
};

// `channels`: the ones this notification is actually sent on
export const EVENTS = {
    PROXY_BID_SET: {
        label: "Proxy bid placed",
        description: "Confirms a bidder's proxy bid when they leave or change it on a lot.",
        channels: ["EMAIL", "SMS"],
    },
    LOT_WON: {
        label: "Lot won",
        description: "Tells the buyer they won a lot, with the winning amount. SMS goes for INR lots only.",
        channels: ["EMAIL", "SMS"],
    },
    REGISTRATION_RECEIVED: {
        label: "Registration received",
        description: "Welcomes a new user once their account is created. The copy to the auction inbox always goes.",
        channels: ["EMAIL"],
    },
    REGISTRATION_APPROVED: {
        label: "Registration approved",
        description: "Tells a user they can bid, when a super admin makes them a bidder.",
        channels: ["EMAIL"],
    },
};

// shown on the page so nobody hunts for a switch that isn't there
export const ALWAYS_SENT = [
    "Sign-up verification codes (email and SMS)",
    "Password reset codes and links (email and SMS)",
    "Login details for a new team member",
    "KYC document requests sent from a user's page",
];

export const eventKey = (event, channel) => `${event}:${channel}`;

export const SETTING_KEYS = [
    ...Object.keys(CHANNELS),
    ...Object.entries(EVENTS).flatMap(([event, { channels }]) => channels.map((channel) => eventKey(event, channel))),
];

// notifications go out in bursts (an auction ending sells many lots at once), so the switches
// are read from the database at most every few seconds. A change on another server shows up
// within this window; on this one it's immediate (the cache is cleared on save).
const CACHE_MS = 5_000;
let cache = null; // { at, settings: Map<key, row> }

const loadSettings = async () => {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.settings;
    const rows = await prisma.notificationSetting.findMany();
    const settings = new Map(rows.map((row) => [row.key, row]));
    cache = { at: Date.now(), settings };
    return settings;
};

const isOn = (settings, key) => settings.get(key)?.enabled ?? true;

/**
 * True when `event` may be sent on `channel` ("EMAIL" / "SMS") — its own switch and the
 * channel's are both on. If the switches can't be read it says true and logs: a database
 * hiccup shouldn't silently swallow a winner's notice.
 */
export const isNotificationEnabled = async (event, channel) => {
    try {
        const settings = await loadSettings();
        const on = isOn(settings, channel) && isOn(settings, eventKey(event, channel));
        if (!on) console.info(`[notify] ${eventKey(event, channel)} is switched off in Settings → Notifications — not sent`);
        return on;
    } catch (error) {
        console.error(`[notify] couldn't read the notification switches (sending ${eventKey(event, channel)}):`, error?.message);
        return true;
    }
};

const describe = (settings, key) => {
    const row = settings.get(key);
    return { enabled: row?.enabled ?? true, updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedByName ?? null };
};

/** Every switch with who changed it last, plus the catalogue the page lays out. */
export const listNotificationSettings = async () => {
    cache = null;
    const settings = await loadSettings();
    return {
        channels: Object.entries(CHANNELS).map(([channel, { label }]) => ({ channel, label, ...describe(settings, channel) })),
        events: Object.entries(EVENTS).map(([event, { label, description, channels }]) => ({
            event,
            label,
            description,
            channels: Object.fromEntries(channels.map((channel) => [channel, describe(settings, eventKey(event, channel))])),
        })),
        alwaysSent: ALWAYS_SENT,
    };
};

/** Switches one channel or notification on / off. `key` must be one of SETTING_KEYS. */
export const setNotificationSetting = async (key, enabled, updatedByName) => {
    const name = updatedByName ? String(updatedByName).slice(0, 160) : null;
    await prisma.notificationSetting.upsert({
        where: { key },
        create: { key, enabled, updatedByName: name },
        update: { enabled, updatedByName: name },
    });
    cache = null;
};

/** A readable name for a key: "Email", "Proxy bid placed (SMS)". */
export const settingLabel = (key) => {
    if (CHANNELS[key]) return CHANNELS[key].allLabel;
    const [event, channel] = key.split(":");
    return `${EVENTS[event]?.label ?? event} (${CHANNELS[channel]?.label ?? channel})`;
};
