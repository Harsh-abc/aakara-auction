import { z } from "zod";

const optionalText = (max) =>
    z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(max).optional());

const optionalDate = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date({ message: "Invalid date" }).optional());

// filters shared by the list and the CSV export
export const activityLogFiltersSchema = z
    .object({
        search: optionalText(200),
        module: optionalText(40),
        action: optionalText(80),
        status: z.enum(["all", "success", "failed"]).default("all"),
        userUuid: z.preprocess((v) => (v === "" ? undefined : v), z.uuid({ message: "Invalid user id" }).optional()),
        ip: optionalText(64),
        from: optionalDate,
        to: optionalDate,
    })
    .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "From date must be before To date", path: ["from"] });

export const getActivityLogsQuerySchema = activityLogFiltersSchema.and(
    z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
    })
);
