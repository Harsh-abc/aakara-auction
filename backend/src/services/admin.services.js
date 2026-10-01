import prisma from '../libs/prisma.js';
import crypto from "crypto";
import bcrypt from "bcrypt";

const MAX_SUPER_ADMINS = 3;


export const changeUserRoleService = async ({ actorUuid, targetUUuid, newRoleName }) => {
    const targetUser = await prisma.user.findUnique({ where: { uuid: targetUUuid } });

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
                data: { roleId: newRole.id },
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

    return {
        uuid: updatedUser.uuid,
        email: updatedUser.email,
        roleId: updatedUser.roleId.toString(),
        roleName: newRole.name,
    };
}





export const createUserByAdminService = async ({ fullName, email, phone, password }, creatorId) => {
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { email: true },
    });
    if (existing) {
        const err = new Error(`${existing.email === email ? "Email" : "Phone"} already in use`);
        err.statusCode = 409;
        throw err;
    }

    const bidderRole = await prisma.role.findUnique({ where: { name: "BIDDER" } });
    if (!bidderRole) {
        const err = new Error("BIDDER role not found");
        err.statusCode = 500;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || "user";
    const username = `${base}_${crypto.randomBytes(3).toString("hex")}`;
    const adminId = BigInt(creatorId);
    const now = new Date();

    try {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    phone,
                    passwordHash,
                    roleId: bidderRole.id,
                    status: "ACTIVE",
                    emailVerified: true,
                    emailVerifiedAt: now,
                    phoneVerified: true,
                    phoneVerifiedAt: now,
                    passwordChangedAt: now,
                    createdById: adminId,
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

            return {
                uuid: user.uuid,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: "BIDDER",
                status: user.status,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                kycStatus: kyc.status,
                createdAt: user.createdAt,
            };
        });
    } catch (error) {
        if (error.code === "P2002") {
            const err = new Error("Email, phone or username already in use");
            err.statusCode = 409;
            throw err;
        }
        throw error;
    }
};