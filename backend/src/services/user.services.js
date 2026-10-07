import bcrypt from 'bcrypt';
import prisma from '../libs/prisma.js';

import { uploadToS3, deleteFromS3 } from "../services/s3.services.js"
import { hashToken } from './auth.services.js';
import { serializeBigInt } from '../utils/serialize.js';
import sendEmail from '../mail/sendMail.js';
import { kycDocumentsRequestedTemplate } from '../mail/templates/kycDocumentsRequested.js';

const KYC_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

export const getAllUsersService = async ({ page, limit, search, emailVerified, kycStatus, role }) => {
    const where = {
        deletedAt: null,
        ...(emailVerified && { emailVerified: emailVerified === 'true' }),
        ...(kycStatus && { kyc: { status: kycStatus } }),
        ...(role && { role: { name: role } }),
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
                    requestedDocuments: true, requestNote: true, requestedAt: true,
                    documents: {
                        select: { ...KYC_DOCUMENT_SELECT, verifiedAt: true },
                        orderBy: { createdAt: 'desc' },
                    },
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

    return serializeBigInt({
        ...user,
        failedLoginAttempts: Number(user.failedLoginAttempts),
        // staff review the newest document of each type; older rejected ones are history
        kyc: user.kyc && { ...user.kyc, documents: currentDocuments(user.kyc.documents) },
    });
};




export const uploadUserKycService = async ({ uuid, kycType, documents, files, adminId }) => {

    const user = await prisma.user.findFirst({
        where: { uuid, deletedAt: null },
        select: { id: true, role: { select: { name: true } }, kyc: { select: { requestedDocuments: true } } },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // documents staff upload here no longer need to be requested from the user
    const uploadedTypes = new Set(documents.map((d) => d.documentType));
    const stillRequested = (user.kyc?.requestedDocuments ?? []).filter((type) => !uploadedTypes.has(type));
    const requestUpdate = stillRequested.length > 0
        ? { requestedDocuments: stillRequested }
        : { requestedDocuments: [], requestNote: null, requestedAt: null, requestedBy: null };

    // approving KYC promotes a USER to BIDDER; other roles are left untouched
    const shouldPromote = user.role.name === 'USER';
    const bidderRole = shouldPromote
        ? await prisma.role.findUnique({ where: { name: 'BIDDER' } })
        : null;

    if (shouldPromote && !bidderRole) {
        const error = new Error('BIDDER role is not configured.');
        error.statusCode = 500;
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
                    ...requestUpdate,
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

            // the user's next token refresh picks up the new role and its permissions
            if (shouldPromote) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { roleId: bidderRole.id },
                });
            }

            return userKyc;
        }, { timeout: 30000 });

        return {
            kycType: kyc.kycType,
            status: kyc.status,
            documentsUploaded: uploaded.length,
            role: shouldPromote ? 'BIDDER' : user.role.name,
        };
    } catch (err) {
        await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
        throw err;
    }
};




export const getMyProfileService = async ({ userId }) => {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
            uuid: true,
            username: true,
            email: true,
            phone: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
            role: { select: { name: true } },
            profile: {
                select: {
                    firstName: true, lastName: true, displayName: true, avatarUrl: true, bio: true,
                    dateOfBirth: true, gender: true, address: true, city: true, state: true,
                    country: true, pincode: true, createdAt: true, updatedAt: true,
                }
            },
            kyc: { select: { kycType: true, status: true, verifiedAt: true, rejectionReason: true } },
        },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};


const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIZE = 1 * 1024 * 1024;


const getS3KeyFromUrl = (url) => {
    try {
        return decodeURIComponent(new URL(url).pathname.slice(1));
    } catch {
        return null;
    }
};

const phoneTakenError = () => {
    const error = new Error('This phone number is already registered');
    error.statusCode = 409;
    return error;
};

export const updateMyProfileService = async ({ userId, data, avatarFile }) => {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true, uuid: true, phone: true, profile: { select: { avatarUrl: true } } },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // phone is a User column; everything else goes to UserProfile
    const { phone, ...profileFields } = data;
    const phoneChanged = phone !== undefined && phone !== user.phone;

    if (phoneChanged && phone) {
        const taken = await prisma.user.findFirst({
            where: { phone, NOT: { id: user.id } },
            select: { id: true },
        });
        if (taken) throw phoneTakenError();
    }

    if (avatarFile) {
        if (!AVATAR_ALLOWED_TYPES.includes(avatarFile.mimetype)) {
            const error = new Error('Avatar must be JPG, PNG or WEBP');
            error.statusCode = 400;
            throw error;
        }
        if (avatarFile.size > AVATAR_MAX_SIZE) {
            const error = new Error('Avatar must be 2 MB or smaller');
            error.statusCode = 400;
            throw error;
        }
    }

    const oldAvatarUrl = user.profile?.avatarUrl ?? null;
    let newAvatarKey = null;

    try {
        const profileData = { ...profileFields };

        if (avatarFile) {
            const result = await uploadToS3({ file: avatarFile, folder: `avatars/${user.uuid}` });
            newAvatarKey = result.key;
            profileData.avatarUrl = result.url;
        }

        const profile = await prisma.$transaction(async (tx) => {
            if (phoneChanged) {
                // a new number hasn't been verified yet
                await tx.user.update({
                    where: { id: user.id },
                    data: { phone, phoneVerified: false, phoneVerifiedAt: null },
                });
            }

            return tx.userProfile.upsert({
                where: { userId: user.id },
                create: { userId: user.id, ...profileData },
                update: profileData,
                select: {
                    firstName: true, lastName: true, displayName: true, avatarUrl: true, bio: true,
                    dateOfBirth: true, gender: true, address: true, city: true, state: true,
                    country: true, pincode: true, createdAt: true, updatedAt: true,
                },
            });
        });

        if (newAvatarKey && oldAvatarUrl) {
            const oldKey = getS3KeyFromUrl(oldAvatarUrl);
            if (oldKey) await deleteFromS3(oldKey).catch(() => { });
        }

        return profile;
    } catch (err) {
        if (newAvatarKey) await deleteFromS3(newAvatarKey).catch(() => { });
        // someone else saved the same number between the check above and the update
        if (err.code === 'P2002') throw phoneTakenError();
        throw err;
    }
};



// Auctions the user is registered for (each with their paddle number), soonest first
export const getMyRegistrationsService = async ({ userId }) => {
    return prisma.auctionParticipant.findMany({
        where: { userId, auction: { deletedAt: null } },
        select: {
            paddleNumber: true,
            status: true,
            registeredAt: true,
            auction: {
                select: {
                    uuid: true, title: true, slug: true, status: true, auctionType: true,
                    coverImageUrl: true, startTime: true, endTime: true, timezone: true,
                },
            },
        },
        orderBy: { auction: { startTime: 'asc' } },
    });
};



export const changeMyPasswordService = async ({ userId, currentPassword, newPassword, currentRefreshToken }) => {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true, passwordHash: true },
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
        // 400, not 401: the client treats a 401 as an expired access token and refreshes
        const error = new Error('Current password is incorrect');
        error.statusCode = 400;
        throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const keepHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, passwordChangedAt: new Date() },
        }),
        // sign out every other device; this browser keeps its session
        prisma.userSession.deleteMany({
            where: { userId: user.id, ...(keepHash && { NOT: { refreshTokenHash: keepHash } }) },
        }),
    ]);
};


// =====================================================================
// SELF-SERVICE KYC (bidder uploads their own documents for staff review)
// =====================================================================

const PHOTO_ID_TYPES = ['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'AADHAAR'];

/**
 * Documents a KYC submission must include, per KYC type. Each entry is satisfied
 * by any one of its types; every other document is optional.
 * Must match KYC_REQUIRED_GROUPS in frontend/lib/constants/kyc.ts
 */
const KYC_REQUIRED_DOCUMENTS = {
    INDIVIDUAL: [
        { label: 'A government photo ID (passport, driving licence, national ID or Aadhaar)', types: PHOTO_ID_TYPES },
    ],
    BUSINESS: [
        { label: 'A government photo ID of the authorised signatory', types: PHOTO_ID_TYPES },
        { label: 'A business registration certificate', types: ['BUSINESS_REGISTRATION'] },
    ],
};

const KYC_SELF_MAX_SIZE = 5 * 1024 * 1024;

// a document in one of these states holds its slot — it can't be uploaded again until it's rejected
const ACTIVE_DOCUMENT_STATUSES = ['PENDING', 'APPROVED'];

const KYC_DOCUMENT_SELECT = {
    id: true, documentType: true, fileName: true, fileUrl: true, mimeType: true,
    fileSize: true, status: true, rejectionReason: true, createdAt: true,
};

/** Newest document of each type (re-uploads keep the rejected ones as history); every "OTHERS" document is kept. */
const currentDocuments = (documents) => {
    const seen = new Set();
    return documents.filter((doc) => {
        if (doc.documentType === 'OTHERS') return true;
        if (seen.has(doc.documentType)) return false;
        seen.add(doc.documentType);
        return true;
    });
};

const httpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const getMyKycService = async ({ userId }) => {
    const kyc = await prisma.userKyc.findUnique({
        where: { userId },
        select: {
            kycType: true, status: true, submittedAt: true, verifiedAt: true,
            rejectedAt: true, rejectionReason: true,
            requestedDocuments: true, requestNote: true, requestedAt: true,
            documents: { select: KYC_DOCUMENT_SELECT, orderBy: { createdAt: 'desc' } },
        },
    });

    if (!kyc) return null;

    return serializeBigInt({ ...kyc, documents: currentDocuments(kyc.documents) });
};

export const submitMyKycService = async ({ userId, kycType, documents, files }) => {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
            id: true,
            uuid: true,
            kyc: {
                select: {
                    status: true,
                    kycType: true,
                    requestedDocuments: true,
                    documents: { select: { documentType: true, status: true }, orderBy: { createdAt: 'desc' } },
                },
            },
        },
    });

    if (!user) throw httpError('User not found', 404);

    // a verified user can keep adding documents, but stays verified as the same KYC type
    const verified = user.kyc?.status === 'VERIFIED';
    if (verified && kycType !== user.kyc.kycType) {
        throw httpError("Your KYC is already verified, so its type can't be changed. Contact us if it needs updating.", 400);
    }

    const statusByType = new Map(
        currentDocuments(user.kyc?.documents ?? [])
            .filter((doc) => doc.documentType !== 'OTHERS')
            .map((doc) => [doc.documentType, doc.status])
    );

    const docsWithFiles = documents.map((doc, i) => {
        if (doc.documentType !== 'OTHERS' && ACTIVE_DOCUMENT_STATUSES.includes(statusByType.get(doc.documentType))) {
            throw httpError(`Your ${doc.documentType.replace(/_/g, ' ').toLowerCase()} is already submitted`, 409);
        }

        const file = files.find((f) => f.fieldname === `document_${i}`);
        if (!file) throw httpError(`File missing for document ${i + 1}`, 400);

        if (!KYC_ALLOWED_TYPES.includes(file.mimetype)) {
            throw httpError(`"${file.originalname}" is not allowed. KYC documents must be JPG, PNG, WEBP or PDF.`, 400);
        }
        if (file.size > KYC_SELF_MAX_SIZE) {
            throw httpError(`"${file.originalname}" is too large. Each document must be 5 MB or smaller.`, 400);
        }

        return { ...doc, file };
    });

    // documents already on file (not rejected) plus this upload must cover every required document
    const held = new Set([
        ...[...statusByType].filter(([, status]) => ACTIVE_DOCUMENT_STATUSES.includes(status)).map(([type]) => type),
        ...documents.map((d) => d.documentType),
    ]);
    const missing = KYC_REQUIRED_DOCUMENTS[kycType].find((req) => !req.types.some((t) => held.has(t)));
    if (missing) throw httpError(`${missing.label} is required`, 400);

    const uploadedKeys = [];
    const uploaded = [];

    try {
        for (const doc of docsWithFiles) {
            const result = await uploadToS3({ file: doc.file, folder: `kyc/${user.uuid}` });
            uploadedKeys.push(result.key);
            uploaded.push({ ...doc, s3: result });
        }

        const now = new Date();

        // uploaded types are no longer outstanding; the note goes once nothing is
        const uploadedTypes = new Set(documents.map((d) => d.documentType));
        const stillRequested = (user.kyc?.requestedDocuments ?? []).filter((type) => !uploadedTypes.has(type));
        const requestUpdate = stillRequested.length > 0
            ? { requestedDocuments: stillRequested }
            : { requestedDocuments: [], requestNote: null, requestedAt: null, requestedBy: null };

        await prisma.$transaction(async (tx) => {
            // (re)submitting puts the KYC back in the review queue — unless it's already
            // verified, in which case the extra documents are just reviewed on their own
            const userKyc = await tx.userKyc.upsert({
                where: { userId: user.id },
                create: { userId: user.id, kycType, status: 'PENDING', submittedAt: now },
                update: verified
                    ? requestUpdate
                    : { kycType, status: 'PENDING', submittedAt: now, rejectedAt: null, rejectionReason: null, ...requestUpdate },
            });

            for (const doc of uploaded) {
                const document = await tx.userKycDocument.create({
                    data: {
                        kycId: userKyc.id,
                        documentType: doc.documentType,
                        fileUrl: doc.s3.url,
                        fileName: doc.s3.fileName,
                        mimeType: doc.file.mimetype,
                        fileSize: BigInt(doc.file.size),
                        status: 'PENDING',
                    },
                });

                await tx.userKycVerification.create({
                    data: {
                        kycId: userKyc.id,
                        documentId: document.id,
                        action: statusByType.get(doc.documentType) === 'REJECTED' ? 'RESUBMITTED' : 'SUBMITTED',
                        status: 'PENDING',
                        performedBy: user.id,
                        reason: 'Submitted by user',
                        metadata: { s3Key: doc.s3.key },
                    },
                });
            }
        }, { timeout: 30000 });
    } catch (err) {
        await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
        throw err;
    }

    return getMyKycService({ userId: user.id });
};



// =====================================================================
// STAFF REVIEW OF SUBMITTED KYC DOCUMENTS
// =====================================================================

const DOCUMENT_TYPE_LABEL = (type) => type.replace(/_/g, ' ').toLowerCase();

/**
 * Overall KYC status once some documents have been reviewed. Approved required documents
 * verify the KYC even while optional ones still wait — so a verified user adding more
 * documents later is never knocked back to "under review".
 */
const resolveKycStatus = (kycType, documents) => {
    const approved = new Set(documents.filter((doc) => doc.status === 'APPROVED').map((doc) => doc.documentType));
    const unmet = KYC_REQUIRED_DOCUMENTS[kycType].filter((req) => !req.types.some((t) => approved.has(t)));
    if (unmet.length === 0) return { status: 'VERIFIED' };

    if (documents.some((doc) => doc.status === 'PENDING')) return { status: 'UNDER_REVIEW' };

    // tell the user what to fix: the rejected documents, or what's still missing
    const rejected = documents.filter((doc) => doc.status === 'REJECTED');
    const reason = rejected.length > 0
        ? rejected.map((doc) => `${DOCUMENT_TYPE_LABEL(doc.documentType)}: ${doc.rejectionReason}`).join('; ')
        : `${unmet[0].label} is required`;
    return { status: 'REJECTED', reason };
};

export const reviewUserKycService = async ({ uuid, reviews, adminId }) => {
    const user = await prisma.user.findFirst({
        where: { uuid, deletedAt: null },
        select: { id: true, role: { select: { name: true } }, kyc: { select: { id: true, kycType: true, status: true } } },
    });

    if (!user) throw httpError('User not found', 404);
    if (!user.kyc) throw httpError('This user has not submitted any KYC documents', 404);
    const wasVerified = user.kyc.status === 'VERIFIED';

    const kycId = user.kyc.id;
    const now = new Date();

    const { status } = await prisma.$transaction(async (tx) => {
        for (const review of reviews) {
            const approve = review.action === 'APPROVE';

            // only a pending document can be reviewed — also stops two reviewers acting on the same one
            const { count } = await tx.userKycDocument.updateMany({
                where: { id: BigInt(review.documentId), kycId, status: 'PENDING' },
                data: approve
                    ? { status: 'APPROVED', verifiedAt: now, verifiedBy: adminId, rejectionReason: null }
                    : { status: 'REJECTED', verifiedAt: null, verifiedBy: adminId, rejectionReason: review.reason },
            });
            if (count === 0) throw httpError('A document was already reviewed or no longer exists. Refresh and try again.', 409);

            await tx.userKycVerification.create({
                data: {
                    kycId,
                    documentId: BigInt(review.documentId),
                    action: approve ? 'APPROVED' : 'REJECTED',
                    status: approve ? 'APPROVED' : 'REJECTED',
                    performedBy: adminId,
                    reason: approve ? 'Approved by staff' : review.reason,
                },
            });
        }

        const documents = await tx.userKycDocument.findMany({
            where: { kycId },
            select: { documentType: true, status: true, rejectionReason: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        const result = resolveKycStatus(user.kyc.kycType, currentDocuments(documents));

        // reviewing extra documents of an already-verified KYC keeps its original verification
        if (!(wasVerified && result.status === 'VERIFIED')) {
            await tx.userKyc.update({
                where: { id: kycId },
                data: result.status === 'VERIFIED'
                    ? { status: 'VERIFIED', verifiedAt: now, verifiedBy: adminId, rejectedAt: null, rejectionReason: null }
                    : result.status === 'REJECTED'
                        ? { status: 'REJECTED', rejectedAt: now, rejectionReason: result.reason, verifiedAt: null, verifiedBy: null }
                        : { status: 'UNDER_REVIEW' },
            });
        }

        // verified KYC promotes a USER to BIDDER (same as staff uploading it); picked up on their next token refresh
        if (result.status === 'VERIFIED' && user.role.name === 'USER') {
            const bidderRole = await tx.role.findUnique({ where: { name: 'BIDDER' } });
            if (!bidderRole) throw httpError('BIDDER role is not configured.', 500);
            await tx.user.update({ where: { id: user.id }, data: { roleId: bidderRole.id } });
        }

        return result;
    }, { timeout: 30000 });

    return { kycStatus: status, user: await getUserByIdService({ uuid }) };
};



// =====================================================================
// STAFF ASKING THE USER FOR MORE KYC DOCUMENTS
// =====================================================================

// email wording; must match KYC_DOCUMENTS titles in frontend/lib/constants/kyc.ts
const KYC_DOCUMENT_TITLES = {
    PASSPORT: 'Passport',
    DRIVERS_LICENSE: 'Driving licence',
    NATIONAL_ID: 'National ID card',
    AADHAAR: 'Aadhaar card',
    PAN_CARD: 'PAN card',
    UTILITY_BILL: 'Utility bill',
    BANK_STATEMENT: 'Bank statement',
    BUSINESS_REGISTRATION: 'Business registration certificate',
    OTHERS: 'Other supporting document',
};

/**
 * Replaces the user's outstanding document request (the list the staff member ticked)
 * and emails the user. Each type drops off the list once the user uploads it.
 */
export const requestKycDocumentsService = async ({ uuid, documentTypes, note, adminId }) => {
    const user = await prisma.user.findFirst({
        where: { uuid, deletedAt: null },
        select: {
            id: true,
            email: true,
            username: true,
            profile: { select: { firstName: true } },
            kyc: { select: { documents: { select: { documentType: true, status: true }, orderBy: { createdAt: 'desc' } } } },
        },
    });

    if (!user) throw httpError('User not found', 404);

    // no point asking for something already on file and not rejected ("others" can always be added)
    const onFile = currentDocuments(user.kyc?.documents ?? [])
        .filter((doc) => doc.documentType !== 'OTHERS' && ACTIVE_DOCUMENT_STATUSES.includes(doc.status))
        .map((doc) => doc.documentType);
    const alreadyHeld = documentTypes.find((type) => onFile.includes(type));
    if (alreadyHeld) throw httpError(`The user's ${KYC_DOCUMENT_TITLES[alreadyHeld].toLowerCase()} is already on file`, 409);

    const request = {
        requestedDocuments: documentTypes,
        requestNote: note || null,
        requestedAt: new Date(),
        requestedBy: adminId,
    };

    // a user who never started KYC gets a placeholder record to hang the request on
    await prisma.userKyc.upsert({
        where: { userId: user.id },
        create: { userId: user.id, kycType: 'INDIVIDUAL', status: 'NOT_SUBMITTED', ...request },
        update: request,
    });

    // the request is saved either way; a mail outage shouldn't undo it
    let emailSent = true;
    try {
        await sendEmail(
            user.email,
            'Documents needed to complete your verification',
            kycDocumentsRequestedTemplate({
                userName: user.profile?.firstName || user.username,
                documents: documentTypes.map((type) => KYC_DOCUMENT_TITLES[type]),
                note,
                uploadUrl: `${process.env.FRONTEND_URL}/my-profile?tab=kyc`,
            })
        );
    } catch (err) {
        console.error('KYC document request email failed:', err);
        emailSent = false;
    }

    return { emailSent, user: await getUserByIdService({ uuid }) };
};
