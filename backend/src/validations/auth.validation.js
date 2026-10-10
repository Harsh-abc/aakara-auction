import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters").regex(/^[a-zA-Z0-9_ ]+$/, "Only letters, numbers, spaces and underscores are allowed"),
    email: z.string().email(),
    password: z.string().min(8).max(64),
    // E.164 (e.g. +919876543210); the frontend checks the length for the chosen country
    phone: z.string().regex(/^\+[0-9]{7,15}$/, "Invalid phone number").optional(),
    city: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
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