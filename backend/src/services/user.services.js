import prisma from '../libs/prisma.js';

import { uploadToS3, deleteFromS3 } from "../services/s3.services.js"

const KYC_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

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




export const uploadUserKycService = async ({ uuid, kycType, documents, files, adminId }) => {

    const user = await prisma.user.findFirst({
        where: { uuid, deletedAt: null },
        select: { id: true },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    const docsWithFiles = documents.map((doc, i) => {
        const file = files.find((f) => f.fieldname === `document_${i}`);

        if (!file) {
            const error = new Error(`File missing for document ${i + 1} (${doc.documentType})`);
            error.statusCode = 400;
            throw error;
        }

        if (!KYC_ALLOWED_TYPES.includes(file.mimetype)) {
            const error = new Error(`"${file.originalname}" is not allowed. KYC documents must be JPG, PNG, WEBP or PDF.`);
            error.statusCode = 400;
            throw error;
        }

        return { ...doc, file };
    });

    const uploadedKeys = [];
    const uploaded = [];

    try {
        for (const doc of docsWithFiles) {
            const result = await uploadToS3({ file: doc.file, folder: `kyc/${uuid}` });
            uploadedKeys.push(result.key);
            uploaded.push({ ...doc, s3: result });
        }

        const now = new Date();

        const kyc = await prisma.$transaction(async (tx) => {
            const userKyc = await tx.userKyc.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    kycType,
                    status: 'VERIFIED',
                    submittedAt: now,
                    verifiedAt: now,
                    verifiedBy: adminId,
                },
                update: {
                    kycType,
                    status: 'VERIFIED',
                    submittedAt: now,
                    verifiedAt: now,
                    verifiedBy: adminId,
                    rejectedAt: null,
                    rejectionReason: null,
                },
            });

            for (const doc of uploaded) {
                const document = await tx.userKycDocument.create({
                    data: {
                        kycId: userKyc.id,
                        documentType: doc.documentType,
                        documentNumber: doc.documentNumber ?? null,
                        fileUrl: doc.s3.url,
                        fileName: doc.s3.fileName,
                        mimeType: doc.file.mimetype,
                        fileSize: BigInt(doc.file.size),
                        status: 'APPROVED',
                        verifiedAt: now,
                        verifiedBy: adminId,
                        expiresAt: doc.expiresAt ?? null,
                    },
                });

                await tx.userKycVerification.create({
                    data: {
                        kycId: userKyc.id,
                        documentId: document.id,
                        action: 'APPROVED',
                        status: 'APPROVED',
                        performedBy: adminId,
                        reason: 'Uploaded and verified by staff',
                        metadata: { uploadedByStaff: true, s3Key: doc.s3.key },
                    },
                });
            }

            return userKyc;
        }, { timeout: 30000 });

        return {
            kycType: kyc.kycType,
            status: kyc.status,
            documentsUploaded: uploaded.length,
        };
    } catch (err) {
        await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
        throw err;
    }
};