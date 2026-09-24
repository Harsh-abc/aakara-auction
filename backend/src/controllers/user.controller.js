import { getAllUsersService, getUserByIdService, uploadUserKycService } from '../services/user.services.js';
import { getAllUsersSchema, getUserByIdSchema, uploadUserKycSchema } from '../validations/user.validation.js';



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