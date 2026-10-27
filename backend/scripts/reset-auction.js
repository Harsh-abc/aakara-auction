// Puts an auction that has already run back to SCHEDULED with a new start time, so
// it can be run again (testing / a rehearsal gone wrong). Bidder registrations and
// lot verifications stay; everything the sale produced is removed:
//   - bids, proxy (auto) bids, winners, extensions
//   - each lot's current bid / leader / bid count, and its SOLD / UNSOLD / PASSED result
//   - the live-bidding keys in Redis
// Lot windows move by the same amount as the auction start (kept inside the auction).
//
//   node scripts/reset-auction.js <auctionUuid> --start 2026-10-27T17:30:00+05:30 [--end <iso>] [--apply]
//
// Without --apply it only prints what would change. With --apply it first writes a JSON
// backup of every row it deletes to scripts/backups/.
import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prisma from "../src/libs/prisma.js";
import redis from "../src/libs/redis.js";
import { auctionKeyList, bidKeys, lotKeyList } from "../src/libs/biddingStore.js";

const RESETTABLE_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED", "ENDED", "SETTLED"];
const KEEP_LOT_STATUSES = ["WITHDRAWN"];

const args = process.argv.slice(2);
const option = (name) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
};
const auctionUuid = args.find((arg) => !arg.startsWith("--") && !args[args.indexOf(arg) - 1]?.startsWith("--"));
const apply = args.includes("--apply");

const parseTime = (value, label) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) throw new Error(`${label}: give an ISO time with an offset, e.g. 2026-10-27T17:30:00+05:30`);
    return date;
};

const json = (value) => JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);

const show = (date, timeZone) =>
    `${date.toLocaleString("en-IN", { timeZone, dateStyle: "medium", timeStyle: "short" })} (${date.toISOString()})`;

if (!auctionUuid || !option("start")) {
    console.error("Usage: node scripts/reset-auction.js <auctionUuid> --start <iso> [--end <iso>] [--apply]");
    process.exit(1);
}

try {
    const newStart = parseTime(option("start"), "--start");
    if (newStart <= new Date()) throw new Error("--start must be in the future");

    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: {
            id: true, uuid: true, title: true, status: true, timezone: true, deletedAt: true,
            startTime: true, endTime: true, registrationDeadline: true,
            items: {
                orderBy: { itemNumber: "asc" },
                select: { id: true, uuid: true, itemNumber: true, status: true, scheduledStartAt: true, scheduledEndAt: true },
            },
        },
    });
    if (!auction || auction.deletedAt) throw new Error(`No auction ${auctionUuid}`);
    if (!RESETTABLE_STATUSES.includes(auction.status)) throw new Error(`Can't reset a ${auction.status} auction`);

    const newEnd = option("end") ? parseTime(option("end"), "--end") : auction.endTime;
    if (newEnd <= newStart) throw new Error("The end must be after the new start");

    const shift = newStart.getTime() - auction.startTime.getTime();
    const clamp = (ms) => new Date(Math.min(Math.max(ms, newStart.getTime()), newEnd.getTime()));
    const lots = auction.items.map((lot) => {
        let start = clamp(lot.scheduledStartAt.getTime() + shift);
        let end = clamp(lot.scheduledEndAt.getTime() + shift);
        if (end <= start) [start, end] = [newStart, newEnd]; // squeezed out -> the whole sale
        return { ...lot, newStatus: KEEP_LOT_STATUSES.includes(lot.status) ? lot.status : "SCHEDULED", start, end };
    });
    // registration that closed with the old sale reopens until the new end
    const newDeadline =
        auction.registrationDeadline && auction.registrationDeadline < newEnd && auction.registrationDeadline <= new Date()
            ? newEnd
            : auction.registrationDeadline;

    const itemIds = auction.items.map((lot) => lot.id);
    const [bids, autoBids, winners, extensions] = await Promise.all([
        prisma.bid.findMany({ where: { itemId: { in: itemIds } } }),
        prisma.autoBid.findMany({ where: { itemId: { in: itemIds } } }),
        prisma.auctionWinner.findMany({ where: { auctionId: auction.id } }),
        prisma.auctionExtension.findMany({ where: { auctionId: auction.id } }),
    ]);

    const tz = auction.timezone;
    console.log(`\n${apply ? "RESETTING" : "DRY RUN —"} "${auction.title}" (${auction.status} -> SCHEDULED)`);
    console.log(`  start: ${show(auction.startTime, tz)}  ->  ${show(newStart, tz)}`);
    console.log(`  end:   ${show(auction.endTime, tz)}  ->  ${show(newEnd, tz)}`);
    if (newDeadline !== auction.registrationDeadline) {
        console.log(`  registration deadline: ${show(auction.registrationDeadline, tz)}  ->  ${show(newDeadline, tz)}`);
    }
    console.log(`  delete: ${bids.length} bid(s), ${autoBids.length} proxy bid(s), ${winners.length} winner(s), ${extensions.length} extension(s)`);
    for (const lot of lots) {
        console.log(`  lot #${lot.itemNumber}: ${lot.status} -> ${lot.newStatus}, opens ${show(lot.start, tz)}, closes ${show(lot.end, tz)}`);
    }
    console.log("  kept: registrations, paddle numbers, lot bidder verifications");

    if (!apply) {
        console.log("\nNothing changed. Run again with --apply to reset.");
    } else {
        // 1. Back up everything that is about to be deleted
        const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "backups");
        await mkdir(dir, { recursive: true });
        const file = path.join(dir, `auction-${auction.uuid}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        await writeFile(file, json({ auction, bids, autoBids, winners, extensions }));
        console.log(`\nBackup: ${file}`);

        // 2. Stop live bids at once — the bid engine checks this cached status
        await redis.set(bidKeys.auctionStatus(auction.uuid), "SCHEDULED", "EX", 60);

        const resetLots = (tx) =>
            Promise.all(
                lots.map((lot) =>
                    tx.auctionItem.update({
                        where: { id: lot.id },
                        data: {
                            status: lot.newStatus,
                            currentBid: null,
                            currentBidderId: null,
                            bidCount: 0n,
                            scheduledStartAt: lot.start,
                            scheduledEndAt: lot.end,
                        },
                    })
                )
            );

        // 3. Database
        await prisma.$transaction(
            async (tx) => {
                await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auction.id} FOR UPDATE`;
                await tx.auctionWinner.deleteMany({ where: { auctionId: auction.id } });
                await tx.auctionExtension.deleteMany({ where: { auctionId: auction.id } });
                await tx.bid.deleteMany({ where: { itemId: { in: itemIds } } });
                await tx.autoBid.deleteMany({ where: { itemId: { in: itemIds } } });
                await resetLots(tx);
                await tx.auction.update({
                    where: { id: auction.id },
                    data: {
                        status: "SCHEDULED",
                        startTime: newStart,
                        endTime: newEnd,
                        startDate: newStart,
                        endDate: newEnd,
                        registrationDeadline: newDeadline,
                    },
                });
                await tx.auctionStatusHistory.create({
                    data: {
                        auctionId: auction.id,
                        fromStatus: auction.status,
                        toStatus: "SCHEDULED",
                        changedBy: null,
                        reason: `Reset for a re-run (scripts/reset-auction.js): bids cleared, starts ${newStart.toISOString()}`,
                    },
                });
            },
            { maxWait: 10_000, timeout: 60_000 }
        );

        // 4. Redis: drop the sale's live-bidding keys
        const keys = [...auctionKeyList(auction.uuid), ...auction.items.flatMap((lot) => lotKeyList(lot.uuid))];
        await redis.del(...keys);
        await redis.srem(bidKeys.dirty, ...auction.items.map((lot) => lot.uuid));
        await redis.srem(bidKeys.flushPending, auction.uuid);

        // 5. A scheduler tick may have copied an old Redis bid back in between — clear the lots once more
        await prisma.$transaction(resetLots);

        console.log(`Done. The scheduler puts it LIVE at ${show(newStart, tz)} (the backend must be running).`);
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
    redis.disconnect();
}
