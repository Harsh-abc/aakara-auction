import { getClientIp } from '../utils/clientIp.js';

// Google reCAPTCHA v2 ("I'm not a robot" checkbox). The challenge difficulty is set per key in the
// reCAPTCHA admin console (Settings → Security preference), not here.
const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

let warnedMissingSecret = false;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// expects the widget's token as `recaptchaToken` in the JSON body. Tokens are single use and expire
// after two minutes, so the frontend resets the widget after every attempt.
export const verifyRecaptcha = async (req, res, next) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
        // never let a missing key quietly switch the check off in production
        if (process.env.NODE_ENV === 'production') {
            console.error('RECAPTCHA_SECRET_KEY is not set; rejecting signup');
            return fail(res, 503, 'Signup is temporarily unavailable. Please try again later.');
        }
        if (!warnedMissingSecret) {
            console.warn('RECAPTCHA_SECRET_KEY is not set; skipping captcha verification (non-production only)');
            warnedMissingSecret = true;
        }
        return next();
    }

    const token = req.body?.recaptchaToken;
    if (typeof token !== 'string' || !token.trim() || token.length > 4000) {
        return fail(res, 400, 'Please complete the captcha to continue.');
    }

    let result;
    try {
        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token, remoteip: getClientIp(req) }),
            signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`siteverify responded ${response.status}`);
        result = await response.json();
    } catch (err) {
        console.error('reCAPTCHA verification request failed:', err);
        return fail(res, 503, 'Could not verify the captcha right now. Please try again.');
    }

    if (!result?.success) {
        // e.g. timeout-or-duplicate (expired / reused token), invalid-input-response
        const codes = result?.['error-codes'] ?? [];
        if (codes.some((code) => code.startsWith('missing-input-secret') || code.startsWith('invalid-input-secret'))) {
            console.error('reCAPTCHA secret key rejected by Google:', codes);
            return fail(res, 503, 'Could not verify the captcha right now. Please try again.');
        }
        return fail(res, 400, 'Captcha verification failed. Please try again.');
    }

    delete req.body.recaptchaToken;
    next();
};
