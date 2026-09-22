import { Router } from 'express';
import { login, logout, refresh, register, verifyOtp } from '../controllers/auth.controller.js';

const authRouter = Router();

// Register route
authRouter.post('/register', register);

// Verify OTP route
authRouter.post('/verify-otp', verifyOtp);

// LOGIN ROUTE
authRouter.post('/login', login)

// REFRESH ROUTE
authRouter.post('/refresh', refresh);

// LOGOUT
authRouter.post('/logout', logout);

export default authRouter;