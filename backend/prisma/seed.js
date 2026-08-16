import prisma from '../src/libs/prisma.js';

const roles = [
    { name: 'BIDDER', description: 'Default role for registered users', isSystemRole: true },
    { name: 'SELLER', description: 'Can list auctions', isSystemRole: true },
    { name: 'ADMIN', description: 'Full platform access', isSystemRole: true },
    { name: 'SUPER_ADMIN', description: 'Full system access', isSystemRole: true },
    { name: 'STAFF', description: 'Platform staff', isSystemRole: true },
];

async function main() {
    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }
    console.log('Roles seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());