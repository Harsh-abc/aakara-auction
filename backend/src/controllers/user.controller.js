import { getAllUsersService, getUserByIdService, uploadUserKycService, getMyProfileService, updateMyProfileService } from '../services/user.services.js';
import { getAllUsersSchema, getUserByIdSchema, uploadUserKycSchema, updateMyProfileSchema } from '../validations/user.validation.js';



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
            message: 'KYC uploaded and verified successfully',
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