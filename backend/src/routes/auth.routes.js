import { Router } from 'express';
import { login, register, verifyOtp } from '../controllers/auth.controller.js';

const authRouter = Router();

// Register route
authRouter.post('/register', register);

// Verify OTP route
authRouter.post('/verify-otp', verifyOtp);

// LOGIN ROUTE
authRouter.post('/login', login)

export default authRouter;