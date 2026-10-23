import { registerSchema, verifyOtpSchema, resendOtpSchema, resendPhoneOtpSchema, loginSchema } from '../validations/auth.validation.js';
import { registerService, resendOtpService, verifyOtpService, verifyPhoneOtpService, resendPhoneOtpService, loginService, refreshService, logoutService } from '../services/auth.services.js';
import { ZodError } from 'zod';
import { getClientIp } from '../utils/clientIp.js';
import { setActivityActor } from '../libs/activityLog.js';
import { SESSION_TTL_MS } from '../libs/session.js';

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
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        next(err);
    }
};

export const verifyOtp = async (req, res, next) => {
    try {
        const data = verifyOtpSchema.parse(req.body);
        const result = await verifyOtpService(data);

        // signups with a phone number still need the phone step before the account exists
        const accountCreated = result.nextStep === null;

        res.status(accountCreated ? 201 : 200).json({
            success: true,
            message: accountCreated
                ? 'Registration successful'
                : result.phoneOtpSent
                    ? 'Email verified. We sent a code to your phone.'
                    : 'Email verified. Request a code to verify your phone number.',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        next(err);
    }
};

export const verifyPhoneOtp = async (req, res, next) => {
    try {
        const data = verifyOtpSchema.parse(req.body);
        const result = await verifyPhoneOtpService(data);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        next(err);
    }
};

// a fresh email code without re-registering (/register needs a new captcha token every time)
export const resendOtp = async (req, res) => {
    try {
        const data = resendOtpSchema.parse(req.body);
        const result = await resendOtpService(data);

        res.status(200).json({
            success: true,
            message: 'A new code has been sent to your email',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        if (!err.statusCode) console.error('resendOtp error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.statusCode ? err.message : 'Could not send the code. Please try again.',
        });
    }
};

// answers errors itself (like login): the cooldown / limit messages are worth showing as-is
export const resendPhoneOtp = async (req, res) => {
    try {
        const data = resendPhoneOtpSchema.parse(req.body);
        const result = await resendPhoneOtpService(data);

        res.status(200).json({
            success: true,
            message: 'A new code has been sent to your phone',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        if (!err.statusCode) console.error('resendPhoneOtp error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.statusCode ? err.message : 'Could not send the code. Please try again.',
        });
    }
};



export const REFRESH_COOKIE_NAME = 'aakara_refresh';

// on UAT/prod the frontend and API sit on different subdomains, so the cookie must be scoped to the
// parent domain (e.g. ".example.com") or the Next proxy never sees it. left host-only on localhost.
const COOKIE_DOMAIN =
    process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN !== 'localhost' ? process.env.COOKIE_DOMAIN : undefined;

const refreshCookieScope = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    domain: COOKIE_DOMAIN,
};

// the cookie goes when the session ends (24h after login), so the user has to log in again
const setRefreshCookie = (res, token, maxAgeMs) => {
    // drop any older host-only copy on the API subdomain so it can't shadow the parent-domain one
    if (COOKIE_DOMAIN) res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    res.cookie(REFRESH_COOKIE_NAME, token, { ...refreshCookieScope, maxAge: maxAgeMs });
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieScope);
    if (COOKIE_DOMAIN) res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
};

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

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] ?? null;

        const { user, role, permissions, accessToken, refreshToken } = await loginService({
            email,
            password,
            ip,
            userAgent,
        });

        setRefreshCookie(res, refreshToken, SESSION_TTL_MS);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user, role, permissions, accessToken },
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};





export const refresh = async (req, res) => {
    try {
        const token = req.cookies?.[REFRESH_COOKIE_NAME];
        const result = await refreshService(token);

        setRefreshCookie(res, result.refreshToken, Math.max(result.sessionExpiresAt.getTime() - Date.now(), 0));

        return res.status(200).json({
            success: true,
            data: {
                user: result.user,
                role: result.role,
                permissions: result.permissions,
                accessToken: result.accessToken,
            },
        });
    } catch (err) {
        clearRefreshCookie(res);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Could not refresh session',
        });
    }
};

export const logout = async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    try {
        // the session is gone once this returns, so say who it was for the activity log
        setActivityActor(req, await logoutService(token));
    } catch (err) {
        console.error('logoutService error:', err);
    } finally {
        clearRefreshCookie(res);
        return res.status(200).json({ success: true, message: 'Logged out' });
    }
};