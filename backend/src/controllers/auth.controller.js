import { registerSchema, verifyOtpSchema } from '../validations/auth.validation.js';
import { registerService, verifyOtpService } from '../services/auth.services.js';

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