import { ZodError } from "zod";

import {
    exportActivityLogsService,
    getActivityLogsService,
    getActivityLogSummaryService,
} from "../services/activityLog.services.js";
import { activityLogFiltersSchema, getActivityLogsQuerySchema } from "../validations/activityLog.validation.js";

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
// GET /api/admin/activity-logs?page&limit&search&module&action&status&userUuid&ip&from&to
// -----------------------------------------------------------------

export const getActivityLogs = async (req, res) => {
    try {
        const query = getActivityLogsQuerySchema.parse(req.query);
        const data = await getActivityLogsService(query);
        return res.status(200).json({ success: true, message: "Activity logs fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get activity logs", "Failed to fetch the activity logs");
    }
};

// -----------------------------------------------------------------
// GET /api/admin/activity-logs/summary — last 24 hours, and the filter lists
// -----------------------------------------------------------------

export const getActivityLogSummary = async (req, res) => {
    try {
        const data = await getActivityLogSummaryService();
        return res.status(200).json({ success: true, message: "Activity summary fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get activity summary", "Failed to fetch the activity summary");
    }
};

// -----------------------------------------------------------------
// GET /api/admin/activity-logs/export — same filters, CSV (newest 10,000 rows)
// -----------------------------------------------------------------

export const exportActivityLogs = async (req, res) => {
    try {
        const filters = activityLogFiltersSchema.parse(req.query);
        const csv = await exportActivityLogsService(filters);
        const stamp = new Date().toISOString().slice(0, 10);
        res.set("Content-Type", "text/csv; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="activity-logs-${stamp}.csv"`);
        res.set("Cache-Control", "no-store");
        return res.status(200).send(csv);
    } catch (error) {
        return handleError(res, error, "Export activity logs", "Failed to export the activity logs");
    }
};
