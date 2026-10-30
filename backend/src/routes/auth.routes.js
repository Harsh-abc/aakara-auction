import { Router } from 'express';
import { forgotPassword, getMfaStatus, login, logout, resetPassword, refresh, register, resendOtp, resendPhoneOtp, startMfaSetup, verifyMfa, verifyOtp, verifyPhoneOtp } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyRecaptcha } from '../middleware/recaptcha.middleware.js';
import { loginLimit, otpLimit, passwordResetLimit, registerLimit } from '../middleware/rateLimit.middleware.js';

const authRouter = Router();

// Register route (captcha-protected)
authRouter.post('/register', registerLimit, verifyRecaptcha, register);

// Resend the email OTP for a signup already in progress — that signup passed the captcha at /register
authRouter.post('/resend-otp', otpLimit, resendOtp);

// Verify OTP route (email step)
authRouter.post('/verify-otp', otpLimit, verifyOtp);

// Verify phone OTP route (runs after the email step, creates the account)
authRouter.post('/verify-phone-otp', otpLimit, verifyPhoneOtp);

// Resend the phone OTP by SMS (MSG91) — the email step stays verified
authRouter.post('/resend-phone-otp', otpLimit, resendPhoneOtp);

// LOGIN ROUTE
authRouter.post('/login', loginLimit, login)

// REFRESH ROUTE
authRouter.post('/refresh', refresh);

// LOGOUT
authRouter.post('/logout', logout);

// FORGOT / RESET PASSWORD — email a reset link, then set a new password from it (rate-limited in the service)
authRouter.post('/forgot-password', passwordResetLimit, forgotPassword);
authRouter.post('/reset-password', passwordResetLimit, resetPassword);

// DASHBOARD AUTHENTICATOR — a dashboard login enters a Google Authenticator code before the
// dashboard opens (libs/dashboardMfa.js). These work before that code, so no requireRole
authRouter.get('/mfa/status', authenticate, getMfaStatus);
authRouter.post('/mfa/setup', authenticate, startMfaSetup);
authRouter.post('/mfa/verify', otpLimit, authenticate, verifyMfa);

export default authRouter;