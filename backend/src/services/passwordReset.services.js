import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_AUDIENCE, jwtSignOptions, jwtVerifyOptions } from '../libs/jwt.js';

import prisma from '../libs/prisma.js';
import redis from '../libs/redis.js';
import { revokeUserTokens } from '../libs/accountBlock.js';
import { canSignIn } from '../libs/userStatus.js';
import sendEmail from '../mail/sendMail.js';
import { passwordResetTemplate } from '../mail/templates/passwordReset.js';

// =====================================================================
// Forgot password → email with a link → choose a new password.
//
// The link carries a signed token (no table needed):
//   - it expires after RESET_TTL_MINUTES
//   - it's tied to a fingerprint of the current password hash, so it stops
//     working the moment the password changes — it can only be used once
//   - it's signed with its own key, so an access token can't pass as one
//
// Requesting a link never says whether the email has an account.
// =====================================================================

export const RESET_TTL_MINUTES = 30;

const PURPOSE = 'password-reset';

// per email and per IP, so the form can't be used to flood an inbox or probe many addresses
const MAX_PER_EMAIL = 3;
const EMAIL_WINDOW_SECONDS = 60 * 60;
const MAX_PER_IP = 10;
const IP_WINDOW_SECONDS = 60 * 60;

const resetSecret = () => `${process.env.JWT_ACCESS_SECRET}:${PURPOSE}`;

// changes whenever the password does
const passwordFingerprint = (passwordHash) =>
    crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 24);

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

// true while under the limit; counts this request
const underLimit = async (key, max, windowSeconds) => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= max;
};

const LINK_DEAD = 'This reset link has expired or has already been used. Request a new one.';

/** Email a reset link if the address belongs to an active account; silent either way. */
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
            passwordHash: true,
            username: true,
            profile: { select: { firstName: true } },
        },
    });
    // unknown or suspended accounts get no email — and the caller can't tell
    if (!user || !canSignIn(user.status)) return;

    const token = jwt.sign(
        { sub: user.uuid, purpose: PURPOSE, pwf: passwordFingerprint(user.passwordHash) },
        resetSecret(),
        jwtSignOptions(JWT_AUDIENCE.PASSWORD_RESET, `${RESET_TTL_MINUTES}m`)
    );
    const siteUrl = (process.env.FRONTEND_URL ?? '').replace(/\/+$/, '');
    const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
        // cc: null — the default MAILGUN_CC must never receive someone's reset link
        await sendEmail(
            user.email,
            'Reset your Akara password',
            passwordResetTemplate({
                userName: user.profile?.firstName || user.username,
                resetUrl,
                expiresInMinutes: RESET_TTL_MINUTES,
            }),
            null
        );
    } catch (error) {
        // the reply stays the same, so a mail outage can't reveal which emails exist
        console.error(`[auth] could not send the password reset email to ${user.email}:`, error);
    }
};

/** Set a new password from a reset link, then sign the account out everywhere. Returns the account email. */
export const resetPasswordService = async ({ token, password }) => {
    let payload;
    try {
        payload = jwt.verify(token, resetSecret(), jwtVerifyOptions(JWT_AUDIENCE.PASSWORD_RESET));
    } catch {
        throw httpError(LINK_DEAD, 400);
    }
    if (payload?.purpose !== PURPOSE || !payload.sub) throw httpError(LINK_DEAD, 400);

    const user = await prisma.user.findFirst({
        where: { uuid: payload.sub, deletedAt: null },
        select: { id: true, email: true, status: true, passwordHash: true },
    });
    // a password changed since the email (including by this same link) retires the link
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
