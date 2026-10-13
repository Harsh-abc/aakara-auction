import prisma from '../libs/prisma.js';
import crypto from "crypto";
import bcrypt from "bcrypt";
import { invalidateBidderAccess } from './bidding.services.js';
import { blockUserAccess, unblockUserAccess } from '../libs/accountBlock.js';
import { disconnectUser } from '../libs/socket.js';

const MAX_SUPER_ADMINS = 3;


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

            const updated = await tx.user.update({
                where: { id: targetUser.id },
                data: { roleId: newRole.id, roleChangedAt: new Date(), roleChangedById: BigInt(actorId) },
                include: {
                    roleChangedBy: {
                        select: {
                            uuid: true,
                            username: true,
                            profile: { select: { firstName: true, lastName: true, displayName: true } },
                        },
                    },
                },
            });

            await tx.userSession.deleteMany({ where: { userId: targetUser.id } });

            return updated;
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

    // only BIDDERs may bid, so gaining or losing the role refreshes who may bid on their lots
    const oldRole = await prisma.role.findUnique({ where: { id: targetUser.roleId }, select: { name: true } });
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
            const err = new Error("Email, phone or username already in use");
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