
import { changeRoleSchema } from '../validations/role.validation.js'
import { changeUserRoleService, createUserByAdminService } from '../services/admin.services.js'
import { createUserSchema } from '../validations/user.validation.js';
import { ZodError } from "zod";

export const changeUserRole = async (req, res, next) => {
    try {
        const { uuid } = req.params;
        const { roleName } = changeRoleSchema.parse(req.body);

        const updatedUser = await changeUserRoleService({
            actorUserId: req.user.userId,
            targetUUuid: uuid,
            newRoleName: roleName,
        });
        res.status(200).json({ message: 'User role updated successfully', user: updatedUser });
    } catch (error) {
        next(error);
    }
}



export const createUserByAdmin = async (req, res) => {
    try {
        const data = createUserSchema.parse(req.body);
        const user = await createUserByAdminService(data, req.user.userId);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
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