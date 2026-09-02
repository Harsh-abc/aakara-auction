import prisma from '../libs/prisma.js';

export const changeUserRoleService = async ({ actorUserId, targetUUuid, newRoleName }) => {
    const targetUser = await prisma.user.findUnique({ where: { uuid: targetUUuid } });

    if (!targetUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    if (targetUser.id === actorUserId) {
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

    const updatedUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
            where: { id: targetUser.id },
            data: { roleId: newRole.id },
        });

        await tx.userSession.deleteMany({ where: { userId: targetUser.id } });

        return updated;
    });

    return {
        uuid: updatedUser.uuid,
        email: updatedUser.email,
        roleId: updatedUser.roleId.toString(),
        roleName: newRole.name,
    };
}