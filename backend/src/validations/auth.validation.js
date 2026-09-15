import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters").regex(/^[a-zA-Z0-9_ ]+$/, "Only letters, numbers, spaces and underscores are allowed"),
    email: z.string().email(),
    password: z.string().min(8).max(64),
    phone: z.string().min(10).max(15).optional(),
});

export const verifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),

    otp: z
        .string()
        .length(6, "OTP must be 6 digits")
        .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required'),
});