import prisma from '../libs/prisma.js';

export const getAllUsersService = async ({ page, limit, search, emailVerified, kycStatus }) => {
    const where = {
        deletedAt: null,
        ...(emailVerified && { emailVerified: emailVerified === 'true' }),
        ...(kycStatus && { kyc: { status: kycStatus } }),
        ...(search && {
            OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [total, users] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                uuid: true,
                username: true,
                email: true,
                phone: true,
                status: true,
                emailVerified: true,
                emailVerifiedAt: true,
                phoneVerified: true,
                phoneVerifiedAt: true,
                lastLoginAt: true,
                lastLoginIp: true,
                passwordChangedAt: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                createdAt: true,
                updatedAt: true,

                role: { select: { name: true } },

                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                        dateOfBirth: true,
                        gender: true,
                        address: true,
                        city: true,
                        state: true,
                        country: true,
                        pincode: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },

                kyc: {
                    select: {
                        kycType: true,
                        status: true,
                        submittedAt: true,
                        verifiedAt: true,
                        rejectedAt: true,
                        rejectionReason: true,
                    },
                },


                _count: {
                    select: {
                        bids: true,
                        auctionsWon: true,
                        auctionParticipations: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    const formattedUsers = users.map((user) => ({
        ...user,
        failedLoginAttempts: Number(user.failedLoginAttempts),
    }));

    return {
        users: formattedUsers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};



export const getUserByIdService = async ({ uuid }) => {
    const user = await prisma.user.findFirst({
        where: { uuid, deletedAt: null },
        select: {
            uuid: true,
            username: true,
            email: true,
            phone: true,
            status: true,
            emailVerified: true,
            emailVerifiedAt: true,
            phoneVerified: true,
            phoneVerifiedAt: true,
            lastLoginAt: true,
            lastLoginIp: true,
            passwordChangedAt: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            createdAt: true,
            updatedAt: true,
            role: { select: { name: true } },
            profile: {
                select: {
                    firstName: true, lastName: true, displayName: true, avatarUrl: true, bio: true,
                    dateOfBirth: true, gender: true, address: true, city: true, state: true,
                    country: true, pincode: true, createdAt: true, updatedAt: true,
                },
            },
            kyc: {
                select: {
                    kycType: true, status: true, submittedAt: true,
                    verifiedAt: true, rejectedAt: true, rejectionReason: true,
                },
            },
            _count: { select: { bids: true, auctionsWon: true, auctionParticipations: true } },
        },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return { ...user, failedLoginAttempts: Number(user.failedLoginAttempts) };
};