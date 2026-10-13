
import { changeRoleSchema, changeUserStatusSchema } from '../validations/role.validation.js'
import { changeUserRoleService, changeUserStatusService, createUserByAdminService } from '../services/admin.services.js'
import { createUserWithRoleSchema } from '../validations/user.validation.js';
import { ZodError } from "zod";

export const changeUserRole = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { roleName } = changeRoleSchema.parse(req.body);

        const updatedUser = await changeUserRoleService({
            actorId: req.user.userId,
            actorUuid: req.user.uuid,
            targetUUuid: uuid,
            newRoleName: roleName,
        });

        return res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            data: updatedUser,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: error.issues?.[0]?.message || "Validation failed",
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}



export const changeUserStatus = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { action } = changeUserStatusSchema.parse(req.body);

        const result = await changeUserStatusService({
            actorUuid: req.user.uuid,
            targetUuid: uuid,
            action,
        });

        return res.status(200).json({
            success: true,
            message: action === 'SUSPEND'
                ? 'User suspended. They have been logged out and can no longer log in.'
                : 'User reactivated. They can log in again.',
            data: result,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: error.issues?.[0]?.message || "Validation failed",
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};



export const createUserByAdmin = async (req, res) => {
    try {
        const data = createUserWithRoleSchema.parse(req.body);
        const user = await createUserByAdminService(data, req.user.userId);

        return res.status(201).json({
            success: true,
            message: `${data.fullName} was added as ${user.role.replace("_", " ").toLowerCase()}`,
            data: user,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: error.issues?.[0]?.message || "Validation failed",
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};