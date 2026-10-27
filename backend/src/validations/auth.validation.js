import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters").regex(/^[a-zA-Z0-9_ ]+$/, "Only letters, numbers, spaces and underscores are allowed"),
    email: z.string().email(),
    password: z.string().min(8).max(64),
    // E.164 (e.g. +919876543210); the frontend checks the length for the chosen country
    phone: z.string().regex(/^\+[0-9]{7,15}$/, "Invalid phone number").optional(),
    city: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    // the user scrolled the full Terms and Conditions and pressed "Accept"; termsVersion is the one they were shown
    acceptTerms: z.literal(true, { message: "Please accept the terms and conditions to sign up" }),
    termsVersion: z.string({ message: "Terms version is required" }).trim().min(1).max(32),
});

export const verifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),

    otp: z
        .string()
        .length(6, "OTP must be 6 digits")
        .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const resendOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const resendPhoneOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required'),
});
// ── forgot / reset password ───────────────────────────────────────────
// a new password follows the same rules as "change password" (user.validation.js)
const newPasswordRule = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be 64 characters or fewer')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol');

export const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'This reset link is incomplete'),
    password: newPasswordRule,
});
