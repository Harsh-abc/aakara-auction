import { Router } from 'express';
import { login, logout, refresh, register, verifyOtp, verifyPhoneOtp } from '../controllers/auth.controller.js';

const authRouter = Router();

// Register route
authRouter.post('/register', register);

// Verify OTP route (email step)
authRouter.post('/verify-otp', verifyOtp);

// Verify phone OTP route (runs after the email step, creates the account)
authRouter.post('/verify-phone-otp', verifyPhoneOtp);

// LOGIN ROUTE
authRouter.post('/login', login)

// REFRESH ROUTE
authRouter.post('/refresh', refresh);

// LOGOUT
authRouter.post('/logout', logout);

export default authRouter;