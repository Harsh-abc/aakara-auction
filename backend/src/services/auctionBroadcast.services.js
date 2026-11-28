import prisma from "../libs/prisma.js";
import { LIVE_STATUSES } from "../libs/liveAccess.js";
import sendEmail from "../mail/sendMail.js";
import { AUCTION_EMAIL, REGISTRATION_INLINE_IMAGES } from "../mail/templates/registrationReceived.js";
import { auctionMessageTemplate, auctionMessageText } from "../mail/templates/auctionMessage.js";
import { serializeBigInt } from "../utils/serialize.js";
import { searchWhere } from "./lotBidder.services.js";

// =====================================================================
// Settings → Auction Emails (super admin). Pick an auction, pick bidders
// registered for it (AuctionParticipant), write a message and send it —
// one email per bidder, so nobody sees anyone else's address.
// =====================================================================

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// banned registrations never get auction messages
const SENDABLE_PARTICIPANT_STATUSES = ["APPROVED", "PENDING", "REJECTED"];

export const MAX_RECIPIENTS_PER_SEND = 2000;
// emails in flight at once — keeps Mailgun happy and the request reasonably quick
const SEND_CONCURRENCY = 5;

const MAIL_OPTIONS = { fromName: "AKARA AUCTIONS", replyTo: AUCTION_EMAIL, inline: REGISTRATION_INLINE_IMAGES };

const PROFILE_SELECT = { select: { firstName: true, lastName: true, displayName: true, avatarUrl: true } };

const personName = (user) =>
    user?.profile?.displayName || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ") || user?.username || "";

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : "";

const findAuction = async (auctionUuid) => {
    const auction = await prisma.auction.findFirst({
        where: { uuid: auctionUuid, deletedAt: null },
        select: { id: true, uuid: true, title: true, status: true, startTime: true },
    });
    if (!auction) throw httpError("Auction not found", 404);
    return auction;
};

// registrations whose bidder can be emailed
const sendableWhere = (auctionId) => ({
    auctionId,
    status: { in: SENDABLE_PARTICIPANT_STATUSES },
    user: { deletedAt: null },
});

// =====================================================================
// READS
// =====================================================================

/** Every auction with how many bidders are registered for it; running sales first, then upcoming, then past. */
export const listBroadcastAuctionsService = async () => {
    const auctions = await prisma.auction.findMany({
        where: { deletedAt: null },
        orderBy: [{ startTime: "desc" }],
        select: {
            id: true,
            uuid: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
            coverImageUrl: true,
            thumbnailImageUrl: true,
        },
    });

    const counts = await prisma.auctionParticipant.groupBy({
        by: ["auctionId", "status"],
        where: { status: { in: SENDABLE_PARTICIPANT_STATUSES }, user: { deletedAt: null } },
        _count: { _all: true },
    });
    const byAuction = new Map();
    for (const row of counts) {
        const key = String(row.auctionId);
        const entry = byAuction.get(key) ?? { total: 0, approved: 0 };
        entry.total += row._count._all;
        if (row.status === "APPROVED") entry.approved += row._count._all;
        byAuction.set(key, entry);
    }

    const rank = (status) => (LIVE_STATUSES.includes(status) ? 0 : ["DRAFT", "SCHEDULED", "PREVIEW"].includes(status) ? 1 : 2);
    return serializeBigInt(
        auctions
            .sort((a, b) => rank(a.status) - rank(b.status))
            .map(({ id, coverImageUrl, thumbnailImageUrl, ...auction }) => {
                const count = byAuction.get(String(id)) ?? { total: 0, approved: 0 };
                return {
                    ...auction,
                    imageUrl: thumbnailImageUrl ?? coverImageUrl ?? null,
                    registeredCount: count.total,
                    approvedCount: count.approved,
                };
            })
    );
};

/** The bidders registered for one auction (banned registrations left out), matching `search` / `status`. */
export const listBroadcastRecipientsService = async ({ auctionUuid, search, status }) => {
    const auction = await findAuction(auctionUuid);
    const rows = await prisma.auctionParticipant.findMany({
        where: {
            ...sendableWhere(auction.id),
            ...(status ? { status } : {}),
            ...(search ? { user: { deletedAt: null, ...searchWhere(search) } } : {}),
        },
        orderBy: [{ registeredAt: "asc" }],
        select: {
            paddleNumber: true,
            status: true,
            registeredAt: true,
            user: { select: { uuid: true, username: true, email: true, phone: true, emailVerified: true, profile: PROFILE_SELECT } },
        },
    });

    return serializeBigInt({
        auction: { uuid: auction.uuid, title: auction.title, status: auction.status, startTime: auction.startTime },
        recipients: rows.map(({ user, ...participant }) => ({
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            phone: user.phone,
            emailVerified: user.emailVerified,
            name: personName(user) || null,
            avatarUrl: user.profile?.avatarUrl ?? null,
            paddleNumber: participant.paddleNumber,
            status: participant.status,
            registeredAt: participant.registeredAt,
        })),
    });
};

// =====================================================================
// SEND
// =====================================================================

// runs `task` over `items`, at most `limit` at a time
const runPool = async (items, limit, task) => {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const item = items[next++];
            await task(item);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

const mailFor = ({ auction, subject, heading, message, userName, paddleNumber }) => {
    const fields = {
        userName,
        siteUrl: process.env.FRONTEND_URL,
        auctionTitle: auction.title,
        auctionDate: formatDate(auction.startTime),
        auctionUuid: auction.uuid,
        paddleNumber: paddleNumber ? String(paddleNumber) : "",
        heading,
        message,
    };
    return { subject, html: auctionMessageTemplate(fields), text: auctionMessageText(fields) };
};

/**
 * Sends the message to the picked bidders of the auction (one email each, no CC).
 * `test: true` sends a single copy to the super admin who is writing it instead.
 */
export const sendAuctionMessageService = async ({ auctionUuid, subject, heading, message, userUuids, test, actorId }) => {
    const auction = await findAuction(auctionUuid);

    if (test) {
        const actor = await prisma.user.findUnique({
            where: { id: BigInt(actorId) },
            select: { email: true, username: true, profile: PROFILE_SELECT },
        });
        if (!actor?.email) throw httpError("Your account has no email address to send the test to");
        const mail = mailFor({ auction, subject: `[TEST] ${subject}`, heading, message, userName: personName(actor), paddleNumber: "" });
        await sendEmail(actor.email, mail.subject, mail.html, null, { ...MAIL_OPTIONS, text: mail.text });
        return { auction: { uuid: auction.uuid, title: auction.title }, test: true, sentTo: actor.email, sent: 1, failed: [] };
    }

    const uuids = [...new Set(userUuids ?? [])];
    if (!uuids.length) throw httpError("Pick at least one bidder");
    if (uuids.length > MAX_RECIPIENTS_PER_SEND) throw httpError(`Send to at most ${MAX_RECIPIENTS_PER_SEND} bidders at a time`);

    const participants = await prisma.auctionParticipant.findMany({
        where: { ...sendableWhere(auction.id), user: { deletedAt: null, uuid: { in: uuids } } },
        select: {
            paddleNumber: true,
            user: { select: { uuid: true, email: true, username: true, profile: PROFILE_SELECT } },
        },
    });
    if (participants.length !== uuids.length) {
        const missing = uuids.length - participants.length;
        throw httpError(
            `${missing} of the selected ${missing === 1 ? "bidder isn't" : "bidders aren't"} registered for this auction (or can't be emailed) — reload the list and try again`
        );
    }

    const sendable = participants.filter((p) => p.user.email);
    const failed = participants
        .filter((p) => !p.user.email)
        .map((p) => ({ uuid: p.user.uuid, email: null, name: personName(p.user), reason: "No email address" }));
    let sent = 0;

    await runPool(sendable, SEND_CONCURRENCY, async ({ paddleNumber, user }) => {
        const mail = mailFor({ auction, subject, heading, message, userName: personName(user), paddleNumber });
        try {
            await sendEmail(user.email, mail.subject, mail.html, null, { ...MAIL_OPTIONS, text: mail.text });
            sent += 1;
        } catch (error) {
            failed.push({ uuid: user.uuid, email: user.email, name: personName(user), reason: error?.message || "Send failed" });
        }
    });

    console.info(`[auction-email] "${subject}" for auction ${auction.uuid}: ${sent} sent, ${failed.length} failed`);
    return { auction: { uuid: auction.uuid, title: auction.title }, test: false, sent, failed };
};
