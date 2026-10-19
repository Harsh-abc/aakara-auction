import prisma from "../libs/prisma.js";
import { ACTIVITY_ACTIONS } from "../middleware/activityLogger.js";
import { toCsv } from "../utils/csv.js";

const EXPORT_MAX_ROWS = 10_000;

const buildWhere = ({ search, module, action, status, userUuid, ip, from, to }) => {
    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (status === "success") where.success = true;
    if (status === "failed") where.success = false;
    if (userUuid) where.user = { is: { uuid: userUuid } };
    if (ip) where.ipAddress = { contains: ip };
    if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
    if (search) {
        const contains = { contains: search, mode: "insensitive" };
        where.OR = [
            { description: contains },
            { actorName: contains },
            { actorEmail: contains },
            { ipAddress: contains },
            { targetLabel: contains },
            { action: contains },
            { path: contains },
        ];
    }
    return where;
};

const toRow = (log) => ({
    id: log.id.toString(),
    createdAt: log.createdAt,
    actor: {
        uuid: log.user?.uuid ?? null,
        name: log.actorName,
        email: log.actorEmail,
        role: log.actorRole,
    },
    module: log.module,
    action: log.action,
    description: log.description,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    success: log.success,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    target: log.targetType ? { type: log.targetType, id: log.targetId, label: log.targetLabel } : null,
    metadata: log.metadata,
    durationMs: log.durationMs,
});

const logInclude = { user: { select: { uuid: true } } };

export const getActivityLogsService = async ({ page, limit, ...filters }) => {
    const where = buildWhere(filters);
    const [total, logs] = await prisma.$transaction([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
            where,
            include: logInclude,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return {
        logs: logs.map(toRow),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

// cards at the top of the page (last 24 hours) and the filter lists
export const getActivityLogSummaryService = async () => {
    const [stats] = await prisma.$queryRaw`
        SELECT
            COUNT(*)::int                                          AS "events",
            COUNT(*) FILTER (WHERE NOT "success")::int             AS "failed",
            COUNT(*) FILTER (WHERE "action" = 'LOGIN_FAILED')::int AS "failedLogins",
            COUNT(DISTINCT "userId")::int                          AS "activeUsers",
            COUNT(DISTINCT "ipAddress")::int                       AS "uniqueIps"
        FROM activity_logs
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    `;

    return {
        last24h: stats,
        modules: [...new Set(ACTIVITY_ACTIONS.map((a) => a.module))].sort(),
        actions: ACTIVITY_ACTIONS,
    };
};

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------

export const exportActivityLogsService = async (filters) => {
    const logs = await prisma.activityLog.findMany({
        where: buildWhere(filters),
        include: logInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: EXPORT_MAX_ROWS,
    });

    const header = [
        "Time (UTC)", "User", "Email", "Role", "Module", "Action", "Description", "Target", "Result",
        "HTTP status", "IP address", "Method", "Path", "Duration (ms)", "User agent", "Details",
    ];
    const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.actorName ?? (log.actorEmail ? "" : "Guest"),
        log.actorEmail,
        log.actorRole,
        log.module,
        log.action,
        log.description,
        log.targetLabel ?? log.targetId,
        log.success ? "Success" : "Failed",
        log.statusCode,
        log.ipAddress,
        log.method,
        log.path,
        log.durationMs,
        log.userAgent,
        log.metadata,
    ]);

    return toCsv(header, rows);
};
