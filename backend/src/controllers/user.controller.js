import { getAllUsersService, getUserStatsService, getUserByIdService, uploadUserKycService, getMyProfileService, updateMyProfileService, getMyRegistrationsService, changeMyPasswordService, getMyKycService, submitMyKycService, reviewUserKycService, requestKycDocumentsService, updateUserDetailsService, setKycStatusService, setUserActiveService } from '../services/user.services.js';
import { getAllUsersSchema, getUserByIdSchema, uploadUserKycSchema, updateMyProfileSchema, changePasswordSchema, submitMyKycSchema, reviewKycSchema, requestKycDocumentsSchema, updateUserDetailsSchema, setKycStatusSchema, setUserActiveSchema } from '../validations/user.validation.js';
import { REFRESH_COOKIE_NAME } from './auth.controller.js';



import { ZodError } from 'zod';

export const getAllUsers = async (req, res) => {
    try {
        const data = getAllUsersSchema.parse(req.query);
        const result = await getAllUsersService(data);

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const getUserStats = async (req, res) => {
    try {
        const stats = await getUserStatsService();
        return res.status(200).json({
            success: true,
            message: 'User stats fetched successfully',
            data: stats,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const getUserById = async (req, res) => {
    try {
        const data = getUserByIdSchema.parse(req.params);
        const user = await getUserByIdService(data);

        return res.status(200).json({
            success: true,
            message: 'User fetched successfully',
            data: user,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};





export const uploadUserKyc = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const { kycType, documents } = uploadUserKycSchema.parse(req.body);

        const result = await uploadUserKycService({
            uuid,
            kycType,
            documents,
            files: req.files ?? [],
            adminId: BigInt(req.user.userId), // match how your authenticate middleware sets req.user
        });

        return res.status(200).json({
            success: true,
            message: result.status === 'VERIFIED'
                ? 'KYC documents added. KYC is still verified.'
                : result.status === 'PENDING' && result.documentsComplete
                    ? 'KYC documents added and approved. All required documents are in: turn on the KYC status toggle to verify.'
                    : 'KYC documents added and approved. KYC is not verified yet: a required document is still missing or awaiting review.',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};





export const getMyProfile = async (req, res) => {
    try {
        const user = await getMyProfileService({ userId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: user,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const updateMyProfile = async (req, res) => {
    try {
        const data = updateMyProfileSchema.parse(req.body ?? {});
        const avatarFile = (req.files ?? []).find((f) => f.fieldname === 'avatar');

        if (Object.keys(data).length === 0 && !avatarFile) {
            return res.status(400).json({ success: false, message: 'Send at least one field or an avatar to update' });
        }

        const profile = await updateMyProfileService({
            userId: BigInt(req.user.userId),
            data,
            avatarFile,
        });

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const getMyRegistrations = async (req, res) => {
    try {
        const registrations = await getMyRegistrationsService({ userId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: 'Registrations fetched successfully',
            data: registrations,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const changeMyPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body ?? {});

        await changeMyPasswordService({
            userId: BigInt(req.user.userId),
            currentPassword,
            newPassword,
            currentRefreshToken: req.cookies?.[REFRESH_COOKIE_NAME],
        });

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

export const getMyKyc = async (req, res) => {
    try {
        const kyc = await getMyKycService({ userId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: 'KYC fetched successfully',
            data: kyc,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const submitMyKyc = async (req, res) => {
    try {
        const { kycType, documents } = submitMyKycSchema.parse(req.body ?? {});

        const kyc = await submitMyKycService({
            userId: BigInt(req.user.userId),
            kycType,
            documents,
            files: req.files ?? [],
        });

        return res.status(200).json({
            success: true,
            message: 'Documents submitted for verification',
            data: kyc,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const reviewUserKyc = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const { reviews } = reviewKycSchema.parse(req.body ?? {});

        const result = await reviewUserKycService({ uuid, reviews, adminId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: 'Review saved',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const updateUserDetails = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const data = updateUserDetailsSchema.parse(req.body ?? {});

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, message: 'Send at least one field to update' });
        }

        const user = await updateUserDetailsService({ uuid, data });

        return res.status(200).json({
            success: true,
            message: 'User details updated',
            data: { user },
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const setKycStatus = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const { verified, reason } = setKycStatusSchema.parse(req.body ?? {});

        const result = await setKycStatusService({ uuid, verified, reason, adminId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: verified ? 'KYC marked as verified' : 'KYC marked as not verified',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const setUserActive = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const { active } = setUserActiveSchema.parse(req.body ?? {});

        const result = await setUserActiveService({ uuid, active, actorUuid: req.user.uuid });

        return res.status(200).json({
            success: true,
            message: active
                ? 'User activated. They can now register for auctions and bid.'
                : "User made inactive. They can still log in but can't register for auctions or bid.",
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};


export const requestKycDocuments = async (req, res) => {
    try {
        const { uuid } = getUserByIdSchema.parse(req.params);
        const { documentTypes, note } = requestKycDocumentsSchema.parse(req.body ?? {});

        const result = await requestKycDocumentsService({ uuid, documentTypes, note, adminId: BigInt(req.user.userId) });

        return res.status(200).json({
            success: true,
            message: result.emailSent
                ? 'Request sent to the user'
                : 'Request saved, but the email could not be sent. The user will still see it on their profile.',
            data: result,
        });
    } catch (err) {
        if (err instanceof ZodError) { return res.status(400).json({ success: false, message: err.issues[0]?.message || "Validation failed", errors: err.issues, }); }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};
