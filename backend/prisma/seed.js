import prisma from '../src/libs/prisma.js';

const roles = [
    { name: 'BIDDER', description: 'Default role for registered users', isSystemRole: true },
    { name: 'AUCTIONEER', description: 'Runs live/floor auctions, manages bids on the floor', isSystemRole: true },
    { name: 'ADMIN', description: 'Full platform access', isSystemRole: true },
    { name: 'SUPER_ADMIN', description: 'Full system access', isSystemRole: true },
    { name: 'STAFF', description: 'Platform staff', isSystemRole: true },
];

const permissions = [
    // Auction
    { module: 'auction', action: 'create', name: 'auction:create', description: 'Create auctions' },
    { module: 'auction', action: 'update', name: 'auction:update', description: 'Update auctions' },
    { module: 'auction', action: 'delete', name: 'auction:delete', description: 'Delete auctions' },
    { module: 'auction', action: 'publish', name: 'auction:publish', description: 'Publish/schedule auctions' },
    { module: 'auction', action: 'control', name: 'auction:control', description: 'Start/pause/resume/end a live auction session' },
    { module: 'auction', action: 'advance_lot', name: 'auction:advance_lot', description: 'Move the auction to the next lot/item' },
    // Bid
    { module: 'bid', action: 'place', name: 'bid:place', description: 'Place bids' },
    { module: 'bid', action: 'cancel', name: 'bid:cancel', description: 'Cancel bids' },
    { module: 'bid', action: 'floor_override', name: 'bid:floor_override', description: 'Enter/override bid values on the floor' },
    // User management
    { module: 'user', action: 'create', name: 'user:create', description: 'Create users' },
    { module: 'user', action: 'update', name: 'user:update', description: 'Update users' },
    { module: 'user', action: 'delete', name: 'user:delete', description: 'Delete users' },
    // KYC
    { module: 'kyc', action: 'approve', name: 'kyc:approve', description: 'Approve KYC submissions' },
    { module: 'kyc', action: 'reject', name: 'kyc:reject', description: 'Reject KYC submissions' },
    // Payments / Disputes
    { module: 'payment', action: 'refund', name: 'payment:refund', description: 'Issue refunds' },
    { module: 'dispute', action: 'resolve', name: 'dispute:resolve', description: 'Resolve disputes' },
];

const rolePermissionMap = {
    SUPER_ADMIN: permissions.map((p) => p.name),
    ADMIN: [
        'auction:create', 'auction:update', 'auction:delete', 'auction:publish', 'auction:control',
        'user:create', 'user:update', 'user:delete',
        'kyc:approve', 'kyc:reject',
        'payment:refund', 'dispute:resolve',
    ],
    STAFF: [
        'auction:create', 'auction:update', 'auction:publish',
        'kyc:approve', 'kyc:reject',
    ],
    AUCTIONEER: [
        'auction:control',
        'bid:floor_override',
        'auction:advance_lot',
    ],
    BIDDER: [
        'bid:place', 'bid:cancel',
    ],
};


async function main() {
    // 1. Roles
    const roleRecords = {};
    for (const role of roles) {
        const record = await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
        roleRecords[role.name] = record;
    }
    console.log('Roles seeded');

    // 2. Permissions
    const permissionRecords = {};
    for (const perm of permissions) {
        const record = await prisma.permission.upsert({
            where: { name: perm.name },
            update: {},
            create: perm,
        });
        permissionRecords[perm.name] = record;
    }
    console.log('Permissions seeded');

    // 3. RolePermission links
    for (const [roleName, codes] of Object.entries(rolePermissionMap)) {
        const role = roleRecords[roleName];
        if (!role) {
            console.warn(`Role "${roleName}" not found in roleRecords, skipping`);
            continue;
        }
        for (const code of codes) {
            const permission = permissionRecords[code];
            if (!permission) {
                console.warn(`Permission "${code}" not found in permissionRecords, skipping`);
                continue;
            }
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });
        }
    }
    console.log('RolePermission links seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());