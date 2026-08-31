import { registerSchema, verifyOtpSchema, loginSchema } from '../validations/auth.validation.js';
import { registerService, verifyOtpService, loginService } from '../services/auth.services.js';

export const register = async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);
        const result = await registerService(data);

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email',
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export const verifyOtp = async (req, res, next) => {
    try {
        const data = verifyOtpSchema.parse(req.body);
        const result = await verifyOtpService(data);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: result,
        });
    } catch (err) {
        next(err);
    }
};



const REFRESH_COOKIE_NAME = 'aakara_refresh';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches REFRESH_TOKEN_TTL_SECONDS

export const login = async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const { email, password } = parsed.data;

        const ip = req.ip;
        const userAgent = req.headers['user-agent'] ?? null;

        const { user, accessToken, refreshToken } = await loginService({
            email,
            password,
            ip,
            userAgent,
        });

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth', // scope the cookie to auth routes (refresh/logout live here)
            maxAge: REFRESH_COOKIE_MAX_AGE_MS,
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user, accessToken },
        });
    } catch (err) {
        next(err);
    }
};