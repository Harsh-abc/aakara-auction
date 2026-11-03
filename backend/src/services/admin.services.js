import prisma from '../libs/prisma.js';
import crypto from "crypto";
import bcrypt from "bcrypt";
import { invalidateBidderAccess } from './bidding.services.js';
import { applyLotsVerified } from './lotBidder.services.js';
import { blockUserAccess, revokeUserTokens, unblockUserAccess } from '../libs/accountBlock.js';
import { disconnectUser } from '../libs/socket.js';
import sendEmail from '../mail/sendMail.js';
import { AUCTION_EMAIL } from '../mail/templates/registrationReceived.js';
import {
    TEAM_MEMBER_ADDED_SUBJECT,
    TEAM_MEMBER_INLINE_IMAGES,
    teamMemberAddedTemplate,
    teamMemberAddedText,
} from '../mail/templates/teamMemberAdded.js';

const MAX_SUPER_ADMINS = 3;

// roles allowed into the dashboard (frontend/lib/constants/roles.ts DASHBOARD_ROLES)
export const TEAM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'AUCTIONEER', 'OPERATIONS'];

const PERSON_SELECT = {
    uuid: true,
    username: true,
    profile: { select: { firstName: true, lastName: true, displayName: true } },
};

// who last set the role, and who turned "Verified for lots" on
const CHANGED_BY_INCLUDE = {
    roleChangedBy: { select: PERSON_SELECT },
    lotsVerifiedBy: { select: PERSON_SELECT },
};


export const changeUserRoleService = async ({ actorId, actorUuid, targetUUuid, newRoleName }) => {
    const targetUser = await prisma.user.findUnique({
        where: { uuid: targetUUuid },
        include: { kyc: { select: { status: true } } },
    });

    if (!targetUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // compare uuids — targetUser.id is a BigInt while the JWT userId is a string
    if (targetUser.uuid === actorUuid) {
        const error = new Error('You cannot change your own role');
        error.statusCode = 400;
        throw error;
    }

    const newRole = await prisma.role.findUnique({ where: { name: newRoleName } });

    if (!newRole) {
        const error = new Error('Role not found');
        error.statusCode = 404;
        throw error;
    }

    if (targetUser.roleId === newRole.id) {
        const error = new Error('User already has this role');
        error.statusCode = 400;
        throw error;
    }

    // signup → KYC approved → a super admin makes them a bidder
    if (newRole.name === 'BIDDER' && targetUser.kyc?.status !== 'VERIFIED') {
        const error = new Error("KYC must be verified before this user can be made a bidder");
        error.statusCode = 400;
        throw error;
    }

    const oldRole = await prisma.role.findUnique({ where: { id: targetUser.roleId }, select: { name: true } });
    // giving bidder access turns "Verified for lots" on (active accounts — the switch needs one too);
    // taking it away turns it off
    const lotsVerified =
        newRole.name === 'BIDDER' && targetUser.status === 'ACTIVE'
            ? true
            : oldRole?.name === 'BIDDER'
                ? false
                : null;

    // their tokens carry the old role: stop them now, not when they expire (up to 24h). Done before
    // the change so a Redis failure refuses the change instead of leaving the old access working
    await revokeUserTokens(targetUser.id);

    let updatedUser;
    try {
        // Serializable so two concurrent promotions can't both pass the limit check
        updatedUser = await prisma.$transaction(async (tx) => {
            if (newRole.name === 'SUPER_ADMIN') {
                const superAdminCount = await tx.user.count({
                    where: { roleId: newRole.id, deletedAt: null },
                });
                if (superAdminCount >= MAX_SUPER_ADMINS) {
                    const error = new Error(`Only ${MAX_SUPER_ADMINS} Super Admins are allowed. Change another Super Admin's role first.`);
                    error.statusCode = 409;
                    throw error;
                }
            }

            await tx.user.update({
                where: { id: targetUser.id },
                data: { roleId: newRole.id, roleChangedAt: new Date(), roleChangedById: BigInt(actorId) },
            });

            if (lotsVerified !== null) await applyLotsVerified(tx, targetUser.id, lotsVerified, actorId);

            await tx.userSession.deleteMany({ where: { userId: targetUser.id } });

            return tx.user.findUnique({ where: { id: targetUser.id }, include: CHANGED_BY_INCLUDE });
        }, { isolationLevel: 'Serializable' });
    } catch (error) {
        // P2034 = serialization conflict with another concurrent role change
        if (error.code === 'P2034') {
            const err = new Error('Another role change is in progress. Please try again.');
            err.statusCode = 409;
            throw err;
        }
        throw error;
    }

    // again now it's saved: a token refreshed while the change ran still had the old role
    await revokeUserTokens(targetUser.id).catch((error) =>
        console.error(`[admin] could not revoke tokens of user ${targetUser.id} after their role change:`, error)
    );
    // live connections drop out of staff rooms; they come back as whatever their token allows
    disconnectUser(targetUser.id);

    // only BIDDERs may bid, so gaining or losing the role refreshes who may bid on their lots
    if (oldRole?.name === 'BIDDER' || newRole.name === 'BIDDER') {
        const lots = await prisma.lotBidder.findMany({
            where: { userId: targetUser.id },
            select: { item: { select: { uuid: true } } },
        });
        if (lots.length > 0) {
            await invalidateBidderAccess({
                lotUuids: lots.map((row) => row.item.uuid),
                revokedUserIds: newRole.name === 'BIDDER' ? [] : [targetUser.id],
            });
        }
    }

    return {
        uuid: updatedUser.uuid,
        email: updatedUser.email,
        roleId: updatedUser.roleId.toString(),
        roleName: newRole.name,
        roleChangedAt: updatedUser.roleChangedAt,
        roleChangedBy: updatedUser.roleChangedBy,
        lotsVerifiedAt: updatedUser.lotsVerifiedAt,
        lotsVerifiedBy: updatedUser.lotsVerifiedBy,
    };
}





/**
 * Suspends or reactivates an account (super admin). A suspended user is logged out
 * everywhere straight away and can't log in, use the API, or bid until reactivated.
 */
export const changeUserStatusService = async ({ actorUuid, targetUuid, action }) => {
    const targetUser = await prisma.user.findFirst({
        where: { uuid: targetUuid, deletedAt: null },
        select: { id: true, uuid: true, status: true, role: { select: { name: true } } },
    });

    if (!targetUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (targetUser.uuid === actorUuid) {
        const error = new Error('You cannot suspend your own account');
        error.statusCode = 400;
        throw error;
    }
    if (targetUser.role.name === 'SUPER_ADMIN') {
        const error = new Error("A super admin can't be suspended. Change their role first.");
        error.statusCode = 400;
        throw error;
    }

    const suspend = action === 'SUSPEND';
    if (suspend && targetUser.status === 'SUSPENDED') {
        const error = new Error('This user is already suspended');
        error.statusCode = 409;
        throw error;
    }
    if (!suspend && targetUser.status !== 'SUSPENDED') {
        const error = new Error('This user is not suspended');
        error.statusCode = 409;
        throw error;
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: targetUser.id },
            data: { status: suspend ? 'SUSPENDED' : 'ACTIVE' },
        }),
        // suspending logs them out of every device (refresh tokens stop working)
        ...(suspend ? [prisma.userSession.deleteMany({ where: { userId: targetUser.id } })] : []),
    ]);

    if (suspend) {
        // access tokens already issued stop working now, not when they expire
        await blockUserAccess(targetUser.id);
        disconnectUser(targetUser.id);
    } else {
        await unblockUserAccess(targetUser.id);
    }

    // who may bid excludes suspended users — refresh it on their lots (suspending also drops their maximum bids)
    const lots = await prisma.lotBidder.findMany({
        where: { userId: targetUser.id },
        select: { item: { select: { uuid: true } } },
    });
    if (lots.length > 0) {
        await invalidateBidderAccess({
            lotUuids: lots.map((row) => row.item.uuid),
            revokedUserIds: suspend ? [targetUser.id] : [],
        });
    }

    return { uuid: targetUser.uuid, status: suspend ? 'SUSPENDED' : 'ACTIVE' };
};


/**
 * Creates a ready-to-use account: ACTIVE, email + phone verified, KYC
 * VERIFIED, with the given role (BIDDER unless a super admin picks another
 * in Settings → Team). At most MAX_SUPER_ADMINS super admins, as for role changes.
 *
 * `afterCreate(tx, user)` runs inside the same transaction once the user,
 * profile and KYC exist (e.g. to register them for an auction). If it
 * throws, nothing is created.
 */
export const createUserByAdminService = async (
    { fullName, email, phone, password, roleName = "BIDDER" },
    creatorId,
    { afterCreate } = {}
) => {
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { email: true },
    });
    if (existing) {
        const err = new Error(`${existing.email === email ? "Email" : "Phone"} already in use`);
        err.statusCode = 409;
        throw err;
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
        const err = new Error(`${roleName} role not found`);
        err.statusCode = roleName === "BIDDER" ? 500 : 400;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || "user";
    const username = `${base}_${crypto.randomBytes(3).toString("hex")}`;
    const adminId = BigInt(creatorId);
    const now = new Date();

    try {
        return await prisma.$transaction(async (tx) => {
            if (role.name === "SUPER_ADMIN") {
                const superAdminCount = await tx.user.count({ where: { roleId: role.id, deletedAt: null } });
                if (superAdminCount >= MAX_SUPER_ADMINS) {
                    const err = new Error(`Only ${MAX_SUPER_ADMINS} Super Admins are allowed. Pick another role.`);
                    err.statusCode = 409;
                    throw err;
                }
            }

            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    phone,
                    passwordHash,
                    roleId: role.id,
                    status: "ACTIVE",
                    emailVerified: true,
                    emailVerifiedAt: now,
                    phoneVerified: true,
                    phoneVerifiedAt: now,
                    passwordChangedAt: now,
                    createdById: adminId,
                    roleChangedAt: now,
                    roleChangedById: adminId,
                    // a new bidder is active with verified KYC, so "Verified for lots" starts on
                    ...(role.name === "BIDDER" ? { lotsVerifiedAt: now, lotsVerifiedById: adminId } : {}),
                },
            });

            const [firstName, ...rest] = fullName.split(/\s+/);
            await tx.userProfile.create({
                data: {
                    userId: user.id,
                    firstName,
                    lastName: rest.join(" ") || null,
                    displayName: fullName,
                },
            });

            const kyc = await tx.userKyc.create({
                data: {
                    userId: user.id,
                    kycType: "INDIVIDUAL",
                    status: "VERIFIED",
                    submittedAt: now,
                    verifiedAt: now,
                    verifiedBy: adminId,
                },
            });

            if (afterCreate) await afterCreate(tx, user);

            return {
                uuid: user.uuid,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: role.name,
                status: user.status,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                kycStatus: kyc.status,
                createdAt: user.createdAt,
            };
            // Serializable so two concurrent super admin creations can't both pass the limit check
        }, role.name === "SUPER_ADMIN" ? { isolationLevel: "Serializable" } : undefined);
    } catch (error) {
        if (error.code === "P2002") {
            const err = new Error("Email or phone already in use");
            err.statusCode = 409;
            throw err;
        }
        // P2034 = serialization conflict with another concurrent super admin change
        if (error.code === "P2034") {
            const err = new Error("Another Super Admin change is in progress. Please try again.");
            err.statusCode = 409;
            throw err;
        }
        throw error;
    }
};

// a new team member gets their role and login details by email; the password is the one the
// Super Admin typed (only the hash is stored), so this is the only place it can come from.
// Returns false instead of throwing — the account already exists either way.
export const sendTeamMemberAddedEmail = async ({ fullName, email, password, roleName }, creatorId) => {
    try {
        const creator = await prisma.user.findUnique({
            where: { id: BigInt(creatorId) },
            select: { username: true, profile: { select: { displayName: true, firstName: true, lastName: true } } },
        });
        const addedBy = creator?.profile?.displayName
            || [creator?.profile?.firstName, creator?.profile?.lastName].filter(Boolean).join(" ")
            || creator?.username
            || "";

        const mail = { userName: fullName, email, password, roleName, addedBy, siteUrl: process.env.FRONTEND_URL };
        // to the new member alone (null = no MAILGUN_CC), since it carries their password
        await sendEmail(email, TEAM_MEMBER_ADDED_SUBJECT, teamMemberAddedTemplate(mail), null, {
            fromName: 'AKARA AUCTIONS',
            replyTo: AUCTION_EMAIL,
            inline: TEAM_MEMBER_INLINE_IMAGES,
            text: teamMemberAddedText(mail),
        });
        return true;
    } catch (error) {
        console.error(`Team member email to ${email} failed:`, error?.message);
        return false;
    }
};


/**
 * Removes a user's Google Authenticator (lost or new phone). Their next visit to the
 * dashboard shows a new QR code to scan; until then no login of theirs can open it.
 */
export const resetUserMfaService = async ({ targetUuid }) => {
    const targetUser = await prisma.user.findFirst({
        where: { uuid: targetUuid, deletedAt: null },
        select: { id: true, totpSecret: true },
    });

    if (!targetUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (!targetUser.totpSecret) {
        const error = new Error("This user hasn't set up an authenticator");
        error.statusCode = 409;
        throw error;
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: targetUser.id },
            data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null },
        }),
        // logins that entered a code from the old authenticator have to use the new one
        prisma.userSession.updateMany({ where: { userId: targetUser.id }, data: { mfaVerifiedAt: null } }),
    ]);

    // their open dashboard tabs refresh into tokens without the code, which sends them to set it up again
    await revokeUserTokens(targetUser.id).catch((error) =>
        console.error(`[admin] could not revoke tokens of user ${targetUser.id} after resetting their authenticator:`, error)
    );
    disconnectUser(targetUser.id);
};
