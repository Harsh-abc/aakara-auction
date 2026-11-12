import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import prisma from '../libs/prisma.js';
import redis from '../libs/redis.js';
import { revokeUserTokens } from '../libs/accountBlock.js';
import { canSignIn } from '../libs/userStatus.js';
import sendEmail from '../mail/sendMail.js';
import { passwordResetTemplate } from '../mail/templates/passwordReset.js';
import { generateOtp } from '../utils/otp.utils.js';

// =====================================================================
// Forgot password → 6-digit code by email → enter the code → choose a new password.
//
// A code rather than a link: most bidders read email on their phone, so a
// link opens there instead of where they're resetting. The code they type in
// on any device.
//
// The code lives in Redis (hashed) for OTP_TTL_MINUTES and allows
// MAX_CODE_ATTEMPTS guesses; a new request replaces it. Entering it right
// swaps it for a short-lived signed reset token (no table needed):
//   - it expires after RESET_TTL_MINUTES
//   - it's tied to a fingerprint of the current password hash, so it stops
//     working the moment the password changes — it can only be used once
//   - it's signed with its own key, so an access token can't pass as one
//
// Neither step ever says whether the email has an account.
// =====================================================================

export const OTP_TTL_MINUTES = 10;
export const RESET_TTL_MINUTES = 15;

const PURPOSE = 'password-reset';

// per email and per IP, so the form can't be used to flood an inbox or probe many addresses
const MAX_PER_EMAIL = 3;
const EMAIL_WINDOW_SECONDS = 60 * 60;
const MAX_PER_IP = 10;
const IP_WINDOW_SECONDS = 60 * 60;

// wrong guesses: per code, and per IP across every email
const MAX_CODE_ATTEMPTS = 5;
const MAX_VERIFY_PER_IP = 30;

const otpKey = (email) => `password-reset:otp:${email}`;
const otpAttemptsKey = (email) => `password-reset:otp-attempts:${email}`;

const resetSecret = () => `${process.env.JWT_ACCESS_SECRET}:${PURPOSE}`;

// changes whenever the password does
const passwordFingerprint = (passwordHash) =>
    crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 24);

const hashOtp = (email, otp) => crypto.createHash('sha256').update(`${email}:${otp}`).digest();

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

// true while under the limit; counts this request
const underLimit = async (key, max, windowSeconds) => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= max;
};

const LINK_DEAD = 'This reset has expired or has already been used. Please start again.';
const CODE_DEAD = 'This code has expired or was entered wrong too many times. Request a new code.';
const CODE_WRONG = 'That code is incorrect. Check the email and try again.';

/** Email a reset code if the address belongs to an active account; silent either way. */
export const requestPasswordResetService = async ({ email, ip }) => {
    const [emailOk, ipOk] = await Promise.all([
        underLimit(`password-reset:email:${email}`, MAX_PER_EMAIL, EMAIL_WINDOW_SECONDS),
        underLimit(`password-reset:ip:${ip}`, MAX_PER_IP, IP_WINDOW_SECONDS),
    ]);
    if (!ipOk) throw httpError('Too many reset requests. Please try again later.', 429);
    // over the per-email limit: answer as usual, just don't send yet another email
    if (!emailOk) return;

    const user = await prisma.user.findFirst({
        where: { email, deletedAt: null },
        select: {
            uuid: true,
            email: true,
            status: true,
            username: true,
            profile: { select: { firstName: true } },
        },
    });
    // unknown or suspended accounts get no email — and the caller can't tell
    if (!user || !canSignIn(user.status)) return;

    // a new code replaces the last one, with a fresh set of attempts
    const otp = generateOtp();
    await redis.set(
        otpKey(email),
        JSON.stringify({ sub: user.uuid, hash: hashOtp(email, otp).toString('hex') }),
        'EX',
        OTP_TTL_MINUTES * 60
    );
    await redis.del(otpAttemptsKey(email));

    try {
        // cc: null — the default MAILGUN_CC must never receive someone's reset code
        await sendEmail(
            user.email,
            'Your AKARA password reset code',
            passwordResetTemplate({
                userName: user.profile?.firstName || user.username,
                otp,
                expiresInMinutes: OTP_TTL_MINUTES,
            }),
            null
        );
    } catch (error) {
        // the reply stays the same, so a mail outage can't reveal which emails exist
        console.error(`[auth] could not send the password reset email to ${user.email}:`, error);
    }
};

/** Check an emailed code; a right one is used up and swapped for a short-lived reset token. */
export const verifyPasswordResetOtpService = async ({ email, otp, ip }) => {
    if (!(await underLimit(`password-reset:verify-ip:${ip}`, MAX_VERIFY_PER_IP, IP_WINDOW_SECONDS))) {
        throw httpError('Too many attempts. Please try again later.', 429);
    }

    const raw = await redis.get(otpKey(email));
    // no code: never sent (unknown email), expired, or burnt — all look the same
    if (!raw) throw httpError(CODE_DEAD, 400);
    const record = JSON.parse(raw);

    const attempts = await redis.incr(otpAttemptsKey(email));
    if (attempts === 1) await redis.expire(otpAttemptsKey(email), OTP_TTL_MINUTES * 60);
    if (attempts > MAX_CODE_ATTEMPTS) {
        await redis.del(otpKey(email), otpAttemptsKey(email));
        throw httpError(CODE_DEAD, 400);
    }

    const expected = Buffer.from(record.hash, 'hex');
    const given = hashOtp(email, otp);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
        if (attempts >= MAX_CODE_ATTEMPTS) {
            await redis.del(otpKey(email), otpAttemptsKey(email));
            throw httpError(CODE_DEAD, 400);
        }
        throw httpError(CODE_WRONG, 400);
    }

    // a code works once
    await redis.del(otpKey(email), otpAttemptsKey(email));

    const user = await prisma.user.findFirst({
        where: { uuid: record.sub, deletedAt: null },
        select: { uuid: true, status: true, passwordHash: true },
    });
    if (!user || !canSignIn(user.status)) throw httpError(CODE_DEAD, 400);

    const resetToken = jwt.sign(
        { sub: user.uuid, purpose: PURPOSE, pwf: passwordFingerprint(user.passwordHash) },
        resetSecret(),
        { expiresIn: `${RESET_TTL_MINUTES}m` }
    );
    return { resetToken };
};

/** Set a new password with the token from a verified code, then sign the account out everywhere. Returns the account email. */
export const resetPasswordService = async ({ token, password }) => {
    let payload;
    try {
        payload = jwt.verify(token, resetSecret());
    } catch {
        throw httpError(LINK_DEAD, 400);
    }
    if (payload?.purpose !== PURPOSE || !payload.sub) throw httpError(LINK_DEAD, 400);

    const user = await prisma.user.findFirst({
        where: { uuid: payload.sub, deletedAt: null },
        select: { id: true, email: true, status: true, passwordHash: true },
    });
    // a password changed since the code was checked (including by this same token) retires the token
    if (!user || payload.pwf !== passwordFingerprint(user.passwordHash)) throw httpError(LINK_DEAD, 400);
    if (!canSignIn(user.status)) {
        throw httpError(
            user.status === 'SUSPENDED'
                ? 'Your account has been suspended. Please contact the auction house.'
                : 'This account is not active.',
            403
        );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            // a fresh password also clears a lock from earlier failed logins
            data: { passwordHash, passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        }),
        // whoever knew the old password is signed out on every device
        prisma.userSession.deleteMany({ where: { userId: user.id } }),
    ]);

    await revokeUserTokens(user.id).catch((error) =>
        console.error(`[auth] could not revoke tokens of user ${user.id} after a password reset:`, error)
    );

    return { email: user.email };
};
