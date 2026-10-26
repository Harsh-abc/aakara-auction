// Removes a user's Google Authenticator from the command line — for when the only
// super admin loses their phone (otherwise: Team → the user's menu → Reset authenticator).
//
//   node scripts/reset-authenticator.js someone@example.com
//
// Their next visit to the dashboard shows a new QR code to scan.
import "dotenv/config";

import prisma from "../src/libs/prisma.js";
import redis from "../src/libs/redis.js";
import { revokeUserTokens } from "../src/libs/accountBlock.js";

const email = process.argv[2]?.trim();

if (!email) {
    console.error("Usage: node scripts/reset-authenticator.js <email>");
    process.exit(1);
}

try {
    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, totpSecret: true },
    });
    if (!user) throw new Error(`No user with the email ${email}`);
    if (!user.totpSecret) {
        console.log(`${email} has no authenticator set up — nothing to reset.`);
    } else {
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null } }),
            prisma.userSession.updateMany({ where: { userId: user.id }, data: { mfaVerifiedAt: null } }),
        ]);
        await revokeUserTokens(user.id);
        console.log(`Authenticator reset for ${email}. They will scan a new QR code the next time they open the dashboard.`);
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
    redis.disconnect();
}
