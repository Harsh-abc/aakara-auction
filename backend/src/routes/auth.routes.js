import { Router } from 'express';
import { login, logout, refresh, register, resendOtp, resendPhoneOtp, verifyOtp, verifyPhoneOtp } from '../controllers/auth.controller.js';
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

export default authRouter;