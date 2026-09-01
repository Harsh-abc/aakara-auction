import prisma from './prisma.js';

export const getRolePermissions = async (roleId) => {
    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: {
            name: true,
            rolePermissions: {
                select: { permission: { select: { name: true } } },
            },
        },
    });

    if (!role) return { roleName: null, permissions: [] };

    return {
        roleName: role.name,
        permissions: role.rolePermissions.map((rp) => rp.permission.name),
    };
};