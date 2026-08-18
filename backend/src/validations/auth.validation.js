import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only'),
    email: z.string().email(),
    password: z.string().min(8).max(64),
    phone: z.string().min(10).max(15).optional(),
});

export const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});