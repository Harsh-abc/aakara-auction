import { getOtpLimitsService, resetAllOtpLimitsService, resetOtpLimitService } from "../services/otpLimit.services.js";

const handleError = (res, error, label, fallback) => {
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/admin/otp-limits — live sign-up OTP counters
// -----------------------------------------------------------------

export const getOtpLimits = async (req, res) => {
    try {
        const data = await getOtpLimitsService();
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "OTP limits fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get OTP limits", "Failed to fetch the OTP limits");
    }
};

// -----------------------------------------------------------------
// DELETE /api/admin/otp-limits/:kind/:subject — resets one counter (subject = email or phone)
// -----------------------------------------------------------------

export const resetOtpLimit = async (req, res) => {
    try {
        const subject = String(req.params.subject ?? "").trim();
        if (!subject || subject.length > 255) {
            return res.status(400).json({ success: false, message: "Invalid email or phone number" });
        }
        await resetOtpLimitService(req.params.kind, subject);
        return res.status(200).json({ success: true, message: `${subject} can request OTP codes again` });
    } catch (error) {
        return handleError(res, error, "Reset OTP limit", "Failed to reset the OTP limit");
    }
};

// -----------------------------------------------------------------
// DELETE /api/admin/otp-limits — resets every counter
// -----------------------------------------------------------------

export const resetAllOtpLimits = async (req, res) => {
    try {
        const count = await resetAllOtpLimitsService();
        return res.status(200).json({
            success: true,
            message: `Reset every OTP limit (${count} ${count === 1 ? "was" : "were"} at the limit)`,
            data: { count },
        });
    } catch (error) {
        return handleError(res, error, "Reset all OTP limits", "Failed to reset the OTP limits");
    }
};
