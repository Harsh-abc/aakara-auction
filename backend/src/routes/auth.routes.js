import { Router } from 'express';
import { getMfaStatus, login, logout, refresh, register, resendOtp, resendPhoneOtp, startMfaSetup, verifyMfa, verifyOtp, verifyPhoneOtp } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyRecaptcha } from '../middleware/recaptcha.middleware.js';

const authRouter = Router();

// Register route (captcha-protected)
authRouter.post('/register', verifyRecaptcha, register);

// Resend the email OTP for a signup already in progress — that signup passed the captcha at /register
authRouter.post('/resend-otp', resendOtp);

// Verify OTP route (email step)
authRouter.post('/verify-otp', verifyOtp);

// Verify phone OTP route (runs after the email step, creates the account)
authRouter.post('/verify-phone-otp', verifyPhoneOtp);

// Resend the phone OTP by SMS (MSG91) — the email step stays verified
authRouter.post('/resend-phone-otp', resendPhoneOtp);

// LOGIN ROUTE
authRouter.post('/login', login)

// REFRESH ROUTE
authRouter.post('/refresh', refresh);

// LOGOUT
authRouter.post('/logout', logout);

// DASHBOARD AUTHENTICATOR — a dashboard login enters a Google Authenticator code before the
// dashboard opens (libs/dashboardMfa.js). These work before that code, so no requireRole
authRouter.get('/mfa/status', authenticate, getMfaStatus);
authRouter.post('/mfa/setup', authenticate, startMfaSetup);
authRouter.post('/mfa/verify', authenticate, verifyMfa);

export default authRouter;