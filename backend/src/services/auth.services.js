import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../libs/prisma.js';
import redis from '../libs/redis.js';
import { generateOtp } from '../utils/otp.utils.js';
import sendEmail from '../mail/sendMail.js';
import { otpVerificationTemplate } from '../mail/templates/otpVerifications.js';

console.log("OTP utility loaded:", generateOtp);

const PENDING_TTL = 10 * 60;
const RESEND_WINDOW = 10 * 60;
const MAX_RESENDS = 3;
const MAX_VERIFY_ATTEMPTS = 5;

const pendingKey = (email) => `register:pending:${email}`;
const resendKey = (email) => `register:otp:resend:${email}`;
const attemptsKey = (email) => `register:otp:verify-attempts:${email}`;


// LOGIN

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_TTL_STRING = '7d';

const IP_BLOCK_WINDOW = 15 * 60;   // 15 minutes
const IP_BLOCK_THRESHOLD = 3;
const IP_BLOCK_DURATION = 30 * 60; // 30 minutes

const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const ipFailKey = (ip) => `login:ip-fail:${ip}`;
const ipBlockKey = (ip) => `login:ip-block:${ip}`;
// LOGIN

export const registerService = async ({ username, email, password, phone }) => {

    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username },
                ...(phone ? [{ phone }] : []),
            ],
        },
        select: { email: true, username: true, phone: true },
    });

    if (existing) {
        let field = 'email';
        if (existing.username === username) field = 'username';
        else if (phone && existing.phone === phone) field = 'phone';
        const error = new Error(`This ${field} is already registered`);
        error.statusCode = 409;
        throw error;
    }

    const resendCount = await redis.incr(resendKey(email));
    if (resendCount === 1) await redis.expire(resendKey(email), RESEND_WINDOW);
    if (resendCount > MAX_RESENDS) {
        const error = new Error('Too many OTP requests. Try again later.');
        error.statusCode = 429;
        throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();

    console.log("Generated OTP:", otp);

    const pendingData = { username, email, passwordHash, phone: phone ?? null, otp };
    await redis.set(pendingKey(email), JSON.stringify(pendingData), 'EX', PENDING_TTL);

    await redis.del(attemptsKey(email));

    await sendEmail(email, 'Verify your email', otpVerificationTemplate(otp, username));

    return { email, expiresInSeconds: PENDING_TTL };
};

export const verifyOtpService = async ({ email, otp }) => {
    const attempts = Number((await redis.get(attemptsKey(email))) ?? 0);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
        await redis.del(pendingKey(email), attemptsKey(email), resendKey(email));
        const error = new Error('Too many failed attempts. Please register again.');
        error.statusCode = 429;
        throw error;
    }

    const raw = await redis.get(pendingKey(email));
    if (!raw) {
        const error = new Error('OTP expired or registration not found. Please register again.');
        error.statusCode = 410;
        throw error;
    }

    const pending = JSON.parse(raw);

    if (pending.otp !== otp) {
        const newCount = await redis.incr(attemptsKey(email));
        if (newCount === 1) await redis.expire(attemptsKey(email), PENDING_TTL);
        const error = new Error('Invalid OTP');
        error.statusCode = 400;
        throw error;
    }


    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { email: pending.email },
                { username: pending.username },
                ...(pending.phone ? [{ phone: pending.phone }] : []),
            ],
        },
    });
    if (existing) {
        await redis.del(pendingKey(email), attemptsKey(email), resendKey(email));
        const error = new Error('Email, username, or phone was just taken. Please register again.');
        error.statusCode = 409;
        throw error;
    }

    const defaultRole = await prisma.role.findFirst({ where: { name: 'BIDDER' } });

    const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                username: pending.username,
                email: pending.email,
                phone: pending.phone,
                passwordHash: pending.passwordHash,
                roleId: defaultRole?.id,
                status: 'ACTIVE',
                emailVerified: true,
                emailVerifiedAt: new Date(),
            },
        });

        await tx.userProfile.create({
            data: {
                userId: newUser.id,
            },
        });

        return newUser;
    });

    await redis.del(pendingKey(email), attemptsKey(email), resendKey(email));

    return { uuid: user.uuid, username: user.username, email: user.email, status: user.status };
};



// ── IP blocking helpers ──────────────────────────────

const isIpBlocked = async (ip) => {
    try {
        const blocked = await redis.get(ipBlockKey(ip));
        return Boolean(blocked);
    } catch (err) {
        // Fail open: never let a Redis outage lock out every login
        console.error('Redis error in isIpBlocked, failing open:', err);
        return false;
    }
};

const registerIpFailure = async (ip) => {
    try {
        const count = await redis.incr(ipFailKey(ip));
        if (count === 1) await redis.expire(ipFailKey(ip), IP_BLOCK_WINDOW);

        if (count >= IP_BLOCK_THRESHOLD) {
            await redis.set(ipBlockKey(ip), '1', 'EX', IP_BLOCK_DURATION);
        }
    } catch (err) {
        console.error('Redis error in registerIpFailure, failing open:', err);
    }
};

const clearIpFailures = async (ip) => {
    try {
        await redis.del(ipFailKey(ip), ipBlockKey(ip));
    } catch (err) {
        console.error('Redis error in clearIpFailures:', err);
    }
};

// ── Audit logging ────────────────────────────────────

const logAttempt = async ({ userId, email, ip, userAgent, success, failureReason }) => {
    await prisma.loginAttempt.create({
        data: {
            userId: userId ?? null,
            email,
            ipAddress: ip,
            userAgent,
            success,
            failureReason: failureReason ?? null,
        },
    });
};

// ── Token issuing ────────────────────────────────────

const issueTokens = ({ userId, uuid, roleId, sessionId }) => {
    const accessToken = jwt.sign(
        { sub: uuid, userId: userId.toString(), roleId: roleId.toString(), sessionId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
        { sub: uuid, sessionId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL_STRING }
    );

    return { accessToken, refreshToken };
};

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

// ── Main service ──────────────────────────────────────

export const loginService = async ({ email, password, ip, userAgent }) => {
    if (await isIpBlocked(ip)) {
        const error = new Error('Too many failed attempts from this IP. Try again later.');
        error.statusCode = 429;
        throw error;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        await registerIpFailure(ip);
        await logAttempt({ userId: null, email, ip, userAgent, success: false, failureReason: 'USER_NOT_FOUND' });
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        await registerIpFailure(ip);
        await logAttempt({ userId: user.id, email, ip, userAgent, success: false, failureReason: 'ACCOUNT_LOCKED' });
        const error = new Error('Account temporarily locked due to repeated failed attempts');
        error.statusCode = 423;
        throw error;
    }

    if (user.status !== 'ACTIVE') {
        await logAttempt({ userId: user.id, email, ip, userAgent, success: false, failureReason: `STATUS_${user.status}` });
        const error = new Error('Account is not active');
        error.statusCode = 403;
        throw error;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
        await registerIpFailure(ip);

        const failedAttempts = user.failedLoginAttempts + 1;
        const shouldLock = failedAttempts >= ACCOUNT_LOCK_THRESHOLD;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: failedAttempts,
                lockedUntil: shouldLock ? new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS) : user.lockedUntil,
            },
        });

        await logAttempt({ userId: user.id, email, ip, userAgent, success: false, failureReason: 'BAD_PASSWORD' });

        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    // ── Success path ──
    await clearIpFailures(ip);

    const sessionId = crypto.randomUUID();
    const { accessToken, refreshToken } = issueTokens({
        userId: user.id,
        uuid: user.uuid,
        roleId: user.roleId,
        sessionId,
    });

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIp: ip,
            },
        }),
        prisma.userSession.create({
            data: {
                id: undefined, // let autoincrement handle it; sessionId (UUID) lives only in the JWT + as a lookup, not the PK
                userId: user.id,
                refreshTokenHash: hashToken(refreshToken),
                ipAddress: ip,
                userAgent,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
            },
        }),
    ]);

    await logAttempt({ userId: user.id, email, ip, userAgent, success: true });

    return {
        user: { uuid: user.uuid, username: user.username, email: user.email, roleId: user.roleId.toString() },
        accessToken,
        refreshToken,
    };
};