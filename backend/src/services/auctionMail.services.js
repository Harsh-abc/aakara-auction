import prisma from "../libs/prisma.js";
import { emitTo, rooms } from "../libs/socket.js";
import sendEmail from "../mail/sendMail.js";
import { AUCTION_EMAIL, REGISTRATION_INLINE_IMAGES } from "../mail/templates/registrationReceived.js";
import { WINNING_BID_SUBJECT, winningBidTemplate, winningBidText } from "../mail/templates/winningBid.js";
import { BIDS_EMAIL, PROXY_BID_SET_SUBJECT, proxyBidSetTemplate, proxyBidSetText } from "../mail/templates/proxyBidSet.js";

// same sender as the registration emails
const WINNER_MAIL_OPTIONS = { fromName: "AKARA AUCTIONS", replyTo: AUCTION_EMAIL, inline: REGISTRATION_INLINE_IMAGES };
// proxy bids come from / reply to the bids inbox. MAILGUN_BIDS_FROM must be on a domain verified
// in Mailgun (e.g. bids@akaraart.com once akaraart.com is) — unset, it goes from MAILGUN_FROM
const PROXY_MAIL_OPTIONS = {
    fromName: "AKARA AUCTIONS",
    fromAddress: process.env.MAILGUN_BIDS_FROM,
    replyTo: BIDS_EMAIL,
    inline: REGISTRATION_INLINE_IMAGES,
};

const formatDateTime = (date) =>
    new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

const personName = (user) =>
    user?.profile?.displayName
    || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ")
    || user?.username
    || "";

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : "";

// "₹1,50,000" / "USD 12,000" — the lot's currency, else the auction's
const formatMoney = (amount, currency) => {
    const value = Number(amount);
    if (!currency?.code) return value.toLocaleString("en-IN");
    try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
    } catch {
        return `${currency.symbol || currency.code} ${value.toLocaleString("en-IN")}`;
    }
};

/**
 * "Winning Bid Confirmation" to the buyer of a sold lot. Call only after the transaction that
 * sold the lot has committed (hammer, stopping a lot over its reserve, or the auction ending),
 * and don't await it: a failed email is logged and never undoes the sale.
 */
export const notifyLotWinner = async (lotUuid) => {
    try {
        const lot = await prisma.auctionItem.findUnique({
            where: { uuid: lotUuid },
            select: {
                itemNumber: true,
                title: true,
                artistName: true,
                status: true,
                currency: { select: { code: true, symbol: true } },
                auction: {
                    select: {
                        uuid: true,
                        title: true,
                        startTime: true,
                        currency: { select: { code: true, symbol: true } },
                    },
                },
                winner: {
                    select: {
                        winnerId: true,
                        finalHammerPrice: true,
                        totalAmountDue: true,
                        winner: {
                            select: {
                                email: true,
                                username: true,
                                profile: { select: { firstName: true, lastName: true, displayName: true } },
                            },
                        },
                    },
                },
            },
        });
        if (lot?.status !== "SOLD" || !lot.winner) return;

        const { auction, winner } = lot;
        const currency = lot.currency ?? auction.currency;

        // only the buyer's signed-in tabs are in this room
        emitTo(rooms.user(String(winner.winnerId)), "lot:won", {
            auctionUuid: auction.uuid,
            auctionTitle: auction.title,
            lotUuid,
            itemNumber: String(lot.itemNumber),
            title: lot.title,
            artistName: lot.artistName,
            hammerPrice: String(winner.finalHammerPrice),
            currency,
        });

        if (!winner.winner?.email) return;
        const auctionDate = formatDate(auction.startTime);
        const mail = {
            userName: personName(winner.winner),
            siteUrl: process.env.FRONTEND_URL,
            auctionName: [auction.title, auctionDate].filter(Boolean).join(" — "),
            lotNumber: String(lot.itemNumber),
            lotName: lot.title,
            // hammer price + buyer's premium, as saved by recordWinner
            winningBidAmount: formatMoney(winner.totalAmountDue, currency),
        };

        // to the buyer alone (null = no MAILGUN_CC)
        await sendEmail(winner.winner.email, WINNING_BID_SUBJECT, winningBidTemplate(mail), null, {
            ...WINNER_MAIL_OPTIONS,
            text: winningBidText(mail),
        });
    } catch (error) {
        console.error(`Winner notice for lot ${lotUuid} failed:`, error?.message);
    }
};

/**
 * "Proxy Bid Confirmation" to a bidder who set or changed a proxy bid. Call once the proxy is
 * saved, and don't await it: a failed email is logged and never undoes the proxy.
 */
export const sendProxyBidSetEmail = async ({ lotUuid, userId, maxAmount, setAt }) => {
    try {
        const [lot, user] = await Promise.all([
            prisma.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: {
                    auctionId: true,
                    itemNumber: true,
                    title: true,
                    currency: { select: { code: true, symbol: true } },
                    auction: { select: { title: true, startTime: true, currency: { select: { code: true, symbol: true } } } },
                },
            }),
            prisma.user.findUnique({
                where: { id: BigInt(userId) },
                select: {
                    email: true,
                    username: true,
                    profile: { select: { firstName: true, lastName: true, displayName: true } },
                },
            }),
        ]);
        if (!lot || !user?.email) return;

        // the bidder ID is their paddle number for this sale
        const participant = await prisma.auctionParticipant.findUnique({
            where: { auctionId_userId: { auctionId: lot.auctionId, userId: BigInt(userId) } },
            select: { paddleNumber: true },
        });

        const { auction } = lot;
        const mail = {
            userName: personName(user),
            siteUrl: process.env.FRONTEND_URL,
            bidderId: participant?.paddleNumber ? String(participant.paddleNumber) : "",
            auctionName: [auction.title, formatDate(auction.startTime)].filter(Boolean).join(" — "),
            lotNumber: String(lot.itemNumber),
            lotName: lot.title,
            maxProxyBid: formatMoney(maxAmount, lot.currency ?? auction.currency),
            proxyBidDate: formatDateTime(setAt ?? new Date()),
        };

        // to the bidder alone (null = no MAILGUN_CC) — the maximum is confidential
        await sendEmail(user.email, PROXY_BID_SET_SUBJECT, proxyBidSetTemplate(mail), null, {
            ...PROXY_MAIL_OPTIONS,
            text: proxyBidSetText(mail),
        });
    } catch (error) {
        console.error(`Proxy bid email for lot ${lotUuid}, user ${userId} failed:`, error?.message);
    }
};
