import { ZodError } from "zod";

import { getDashboardCalendarService, getDashboardOverviewService } from "../services/dashboard.services.js";
import { getDashboardCalendarQuerySchema } from "../validations/auction.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: error.issues?.[0]?.message || "Validation failed",
        });
    }
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/overview
// Stat cards, upcoming sales, running sales and the latest bids
// -----------------------------------------------------------------

export const getDashboardOverview = async (req, res) => {
    try {
        const data = await getDashboardOverviewService();
        return res.status(200).json({
            success: true,
            message: "Dashboard fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get dashboard overview", "Failed to fetch the dashboard");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/calendar?month=YYYY-MM
// Published sales overlapping the month
// -----------------------------------------------------------------

export const getDashboardCalendar = async (req, res) => {
    try {
        const query = getDashboardCalendarQuerySchema.parse(req.query);
        const data = await getDashboardCalendarService(query);
        return res.status(200).json({
            success: true,
            message: "Auction calendar fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get dashboard calendar", "Failed to fetch the auction calendar");
    }
};
