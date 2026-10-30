import redis from "../libs/redis.js";

// =====================================================================
// Per-IP request limits, kept in Redis so every API instance shares them:
//
//   rl:{name}:{ip}   requests from the IP in the current fixed window
//
// Only the expensive / abusable endpoints are limited (bcrypt sign-ins and
// sign-ups, OTP checks, LiveKit tokens) — not the whole API, so bidders behind
// one office or mobile-carrier IP aren't throttled mid-sale.
// =====================================================================

export const rateLimit = ({ name, windowSeconds, max, message = "Too many requests, please try again later" }) =>
    async (req, res, next) => {
        const key = `rl:${name}:${req.ip}`;
        let count;
        try {
            // SET NX starts the window once; INCR counts within it — both in one round trip
            const [, [, incremented]] = await redis.multi().set(key, 0, "EX", windowSeconds, "NX").incr(key).exec();
            count = incremented;
        } catch (err) {
            // Fail open: never let a Redis outage refuse every request
            console.error(`Redis error in rateLimit(${name}), failing open:`, err);
            return next();
        }

        if (count > max) {
            const ttl = await redis.ttl(key).catch(() => windowSeconds);
            res.set("Retry-After", String(ttl > 0 ? ttl : windowSeconds));
            return res.status(429).json({ success: false, message });
        }
        return next();
    };

export const loginLimit = rateLimit({ name: "login", windowSeconds: 60, max: 20 });
export const registerLimit = rateLimit({ name: "register", windowSeconds: 60 * 60, max: 10 });
export const otpLimit = rateLimit({ name: "otp", windowSeconds: 10 * 60, max: 30 });
export const passwordResetLimit = rateLimit({ name: "pwreset", windowSeconds: 10 * 60, max: 10 });
export const liveTokenLimit = rateLimit({ name: "live-token", windowSeconds: 60, max: 30 });
