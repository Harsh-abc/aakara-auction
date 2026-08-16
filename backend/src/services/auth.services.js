import bcrypt from 'bcrypt';
import redis from '../libs/redis.js';
import prisma from '../libs/prisma.js';
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