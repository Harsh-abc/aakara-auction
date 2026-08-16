import { Router } from 'express';
import { register, verifyOtp } from '../controllers/auth.controller.js';

const authRouter = Router();

// Register route
authRouter.post('/register', register);

// Verify OTP route
authRouter.post('/verify-otp', verifyOtp);


export default authRouter;