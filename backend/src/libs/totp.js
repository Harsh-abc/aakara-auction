import crypto from "crypto";

// =====================================================================
// TOTP (RFC 6238) — the 6-digit codes Google Authenticator shows:
// HMAC-SHA1 of the 30-second time step, keyed by a shared base32 secret.
// =====================================================================

const STEP_SECONDS = 30;
const DIGITS = 6;
const SECRET_BYTES = 20; // 160 bits, as RFC 4226 recommends

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const base32Encode = (buffer) => {
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out;
};

export const base32Decode = (text) => {
    const clean = text.replace(/[\s=-]/g, "").toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const index = BASE32.indexOf(char);
        if (index === -1) throw new Error("Invalid base32 secret");
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
};

/** A new random secret, base32 (what the authenticator app stores). */
export const generateTotpSecret = () => base32Encode(crypto.randomBytes(SECRET_BYTES));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/** The code for one time step. */
export const totpCode = (secret, step) => {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
    return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
};

/**
 * The time step `code` belongs to, or null. Accepts the step before and after
 * the current one too (phone clocks drift), but never `lastStep` or anything
 * older, so a code can't be used twice.
 */
export const verifyTotp = (secret, code, { lastStep = null, window = 1, now = Date.now() } = {}) => {
    if (!/^\d{6}$/.test(code ?? "")) return null;
    const step = currentStep(now);
    for (let offset = -window; offset <= window; offset++) {
        const candidate = step + offset;
        if (lastStep !== null && candidate <= lastStep) continue;
        const expected = Buffer.from(totpCode(secret, candidate));
        if (crypto.timingSafeEqual(expected, Buffer.from(code))) return candidate;
    }
    return null;
};

/** The otpauth:// link a QR code carries — the app shows `issuer (account)`. */
export const otpauthUrl = ({ secret, account, issuer }) => {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${params}`;
};
