
import { changeRoleSchema } from '../validations/role.validation.js'
import { changeUserRoleService } from '../services/admin.services.js'

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