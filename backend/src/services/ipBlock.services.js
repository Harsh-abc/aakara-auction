import prisma from "../libs/prisma.js";
import {
    IP_BLOCK_DURATION,
    IP_BLOCK_THRESHOLD,
    IP_BLOCK_WINDOW,
    listIpBlocks,
    unblockAllIps,
    unblockIp,
} from "../libs/loginIpBlock.js";

const MAX_EMAILS_PER_IP = 5;

// =====================================================================
// Settings → Blocked IPs (super admin): sign-in IP blocks from Redis,
// with the failed sign-ins behind each one from login_attempts
// =====================================================================

export const getIpBlocksService = async () => {
    const entries = await listIpBlocks();

    // the failures that counted towards a block are at most a window + a block old
    const since = new Date(Date.now() - (IP_BLOCK_WINDOW + IP_BLOCK_DURATION) * 1000);
    const attempts = entries.length
        ? await prisma.loginAttempt.findMany({
            where: { ipAddress: { in: entries.map((e) => e.ip) }, success: false, createdAt: { gte: since } },
            select: { ipAddress: true, email: true, userAgent: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 5000,
        })
        : [];

    const recentByIp = new Map();
    for (const attempt of attempts) {
        let recent = recentByIp.get(attempt.ipAddress);
        if (!recent) {
            // newest first, so the first row is the last attempt
            recent = { lastAttemptAt: attempt.createdAt, userAgent: attempt.userAgent, emails: new Set() };
            recentByIp.set(attempt.ipAddress, recent);
        }
        recent.emails.add(attempt.email);
    }

    const ips = entries
        .map((entry) => {
            const recent = recentByIp.get(entry.ip);
            const emails = recent ? [...recent.emails] : [];
            return {
                ...entry,
                lastAttemptAt: recent?.lastAttemptAt ?? null,
                userAgent: recent?.userAgent ?? null,
                emails: emails.slice(0, MAX_EMAILS_PER_IP),
                emailCount: emails.length,
            };
        })
        // blocked first, then the IPs closest to a block
        .sort((a, b) => Number(b.blocked) - Number(a.blocked) || b.failedAttempts - a.failedAttempts);

    return {
        ips,
        rules: { threshold: IP_BLOCK_THRESHOLD, windowSeconds: IP_BLOCK_WINDOW, blockSeconds: IP_BLOCK_DURATION },
    };
};

export const unblockIpService = async (ip) => {
    const removed = await unblockIp(ip);
    if (!removed) {
        const error = new Error("This IP address is not blocked");
        error.statusCode = 404;
        throw error;
    }
};

export const unblockAllIpsService = () => unblockAllIps();
