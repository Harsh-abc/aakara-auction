import { listOtpLimits, OTP_LIMIT_KINDS, otpLimitRules, resetAllOtpLimits, resetOtpLimit } from "../libs/otpLimits.js";

// =====================================================================
// Settings → OTP Limits (super admin): sign-up OTP counters from Redis
// =====================================================================

export const getOtpLimitsService = async () => {
    const limits = (await listOtpLimits())
        // at the limit first, then the fullest counters
        .sort((a, b) => Number(b.limited) - Number(a.limited) || b.count / b.max - a.count / a.max);
    return { limits, rules: otpLimitRules() };
};

export const resetOtpLimitService = async (kind, subject) => {
    if (!OTP_LIMIT_KINDS.includes(kind)) {
        const error = new Error("Unknown OTP limit");
        error.statusCode = 400;
        throw error;
    }
    const removed = await resetOtpLimit(kind, subject);
    if (!removed) {
        const error = new Error("This OTP limit has already been reset");
        error.statusCode = 404;
        throw error;
    }
};

export const resetAllOtpLimitsService = () => resetAllOtpLimits();
