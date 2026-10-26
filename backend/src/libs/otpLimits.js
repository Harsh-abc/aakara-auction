import redis, { deleteKeys, scanKeys } from "./redis.js";

// =====================================================================
// Sign-up OTP limits, kept in Redis. Each is a counter that refuses more
// codes once it reaches its max, until the key expires:
//
//   EMAIL_OTP   register:otp:resend:{email}       email codes per signup (register + resend)
//               → "Too many OTP requests. Try again later."
//   SIGNUP_SMS  register:phone-otp:sends:{email}  SMS codes per signup
//               → "Too many SMS codes requested. Try again later."
//   PHONE_SMS   sms:otp:count:{phone}             SMS codes to one number, whichever email asks
//               → "Too many codes have been sent to this number."
//
// Settings → OTP Limits lists these and lets a super admin reset them.
// =====================================================================

export const RESEND_WINDOW = 10 * 60;
export const MAX_RESENDS = 3;

export const MAX_PHONE_SENDS = 4;            // first SMS + 3 resends per signup…
export const PHONE_SENDS_WINDOW = 30 * 60;
export const MAX_SMS_PER_PHONE = 10;         // …and per number, whichever email asks (stops SMS bombing)
export const SMS_PER_PHONE_WINDOW = 60 * 60;

const LIMITS = {
    EMAIL_OTP: { prefix: "register:otp:resend:", max: MAX_RESENDS, windowSeconds: RESEND_WINDOW },
    SIGNUP_SMS: { prefix: "register:phone-otp:sends:", max: MAX_PHONE_SENDS, windowSeconds: PHONE_SENDS_WINDOW },
    PHONE_SMS: { prefix: "sms:otp:count:", max: MAX_SMS_PER_PHONE, windowSeconds: SMS_PER_PHONE_WINDOW },
};

export const OTP_LIMIT_KINDS = Object.keys(LIMITS);

const ATTEMPTS_PREFIX = "register:otp:verify-attempts:";
const COOLDOWN_PREFIX = "register:phone-otp:cooldown:";

export const resendKey = (email) => `${LIMITS.EMAIL_OTP.prefix}${email}`;
export const attemptsKey = (email) => `${ATTEMPTS_PREFIX}${email}`;
export const phoneSendsKey = (email) => `${LIMITS.SIGNUP_SMS.prefix}${email}`;
export const phoneCooldownKey = (email) => `${COOLDOWN_PREFIX}${email}`;
export const smsPerPhoneKey = (phone) => `${LIMITS.PHONE_SMS.prefix}${phone}`;

// reset along with a limit, so the next request goes straight through:
// the wrong-code count, and the 30s wait between SMS resends
const RESET_WITH = {
    EMAIL_OTP: (email) => [attemptsKey(email)],
    SIGNUP_SMS: (email) => [phoneCooldownKey(email)],
    PHONE_SMS: () => [],
};

export const otpLimitRules = () =>
    Object.fromEntries(OTP_LIMIT_KINDS.map((kind) => [kind, { max: LIMITS[kind].max, windowSeconds: LIMITS[kind].windowSeconds }]));

/**
 * Every live OTP counter: the email or phone it counts, how many codes so far,
 * whether it's at its max, and the time left on the key in ms (null = no expiry).
 */
export const listOtpLimits = async () => {
    const keysByKind = await Promise.all(OTP_LIMIT_KINDS.map((kind) => scanKeys(`${LIMITS[kind].prefix}*`)));
    const counters = OTP_LIMIT_KINDS.flatMap((kind, i) =>
        keysByKind[i].map((key) => ({ kind, key, subject: key.slice(LIMITS[kind].prefix.length) }))
    );
    if (!counters.length) return [];

    const pipeline = redis.pipeline();
    for (const { key } of counters) pipeline.get(key).pttl(key);
    const results = (await pipeline.exec()).map(([err, value]) => (err ? null : value));

    return counters
        .map(({ kind, subject }, i) => {
            const count = Number(results[i * 2] ?? 0);
            const pttl = results[i * 2 + 1];
            return {
                kind,
                subject,
                count,
                max: LIMITS[kind].max,
                limited: count >= LIMITS[kind].max,
                // PTTL: -2 = key gone, -1 = no expiry
                expiresInMs: pttl > 0 ? pttl : null,
            };
        })
        .filter((entry) => entry.count > 0);
};

/** Resets one counter; returns how many keys were removed (0 = nothing to reset). */
export const resetOtpLimit = (kind, subject) => {
    const limit = LIMITS[kind];
    return redis.del(`${limit.prefix}${subject}`, ...RESET_WITH[kind](subject));
};

/** Resets every OTP counter; returns how many were at their max. */
export const resetAllOtpLimits = async () => {
    const limited = (await listOtpLimits()).filter((entry) => entry.limited).length;
    const keys = await Promise.all(
        [...OTP_LIMIT_KINDS.map((kind) => LIMITS[kind].prefix), ATTEMPTS_PREFIX, COOLDOWN_PREFIX].map((prefix) => scanKeys(`${prefix}*`))
    );
    await deleteKeys(keys.flat());
    return limited;
};
