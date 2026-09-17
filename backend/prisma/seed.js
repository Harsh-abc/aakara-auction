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

const categories = [
    {
        name: "Paintings",
        slug: "paintings",
        description: "Original paintings and artworks created using various painting techniques.",
        sortOrder: 1,
        subCategories: [
            "Abstract",
            "Contemporary",
            "Modern",
            "Traditional",
            "Landscape",
            "Portrait",
            "Still Life",
            "Figurative",
            "Miniature",
        ],
    },
    {
        name: "Sculptures",
        slug: "sculptures",
        description: "Three-dimensional artworks created using various materials and techniques.",
        sortOrder: 2,
        subCategories: [
            "Bronze",
            "Stone",
            "Wood",
            "Metal",
            "Ceramic",
            "Marble",
            "Mixed Media",
        ],
    },
    {
        name: "Photography",
        slug: "photography",
        description: "Fine art and collectible photographic works.",
        sortOrder: 3,
        subCategories: [
            "Fine Art Photography",
            "Black & White",
            "Contemporary Photography",
            "Documentary",
            "Landscape Photography",
            "Portrait Photography",
        ],
    },
    {
        name: "Prints & Multiples",
        slug: "prints-multiples",
        description: "Limited edition prints and artworks produced using printmaking techniques.",
        sortOrder: 4,
        subCategories: [
            "Lithographs",
            "Serigraphs",
            "Etchings",
            "Woodcuts",
            "Linocuts",
            "Limited Edition Prints",
        ],
    },
    {
        name: "Decorative Art",
        slug: "decorative-art",
        description: "Decorative and functional artistic objects and design works.",
        sortOrder: 5,
        subCategories: [
            "Ceramics",
            "Glass Art",
            "Textiles",
            "Tapestries",
            "Furniture",
            "Decorative Objects",
        ],
    },
    {
        name: "Jewellery",
        slug: "jewellery",
        description: "Fine, designer and collectible jewellery offered through auctions.",
        sortOrder: 6,
        subCategories: [
            "Rings",
            "Necklaces",
            "Bracelets",
            "Earrings",
            "Brooches",
            "Designer Jewellery",
        ],
    },
    {
        name: "Collectibles",
        slug: "collectibles",
        description: "Rare, historical and collectible objects.",
        sortOrder: 7,
        subCategories: [
            "Coins",
            "Stamps",
            "Memorabilia",
            "Manuscripts",
            "Books",
            "Antiques",
        ],
    },
    {
        name: "Contemporary Art",
        slug: "contemporary-art",
        description: "Contemporary artworks using traditional and emerging artistic practices.",
        sortOrder: 8,
        subCategories: [
            "Mixed Media",
            "Installation Art",
            "Digital Art",
            "New Media Art",
            "Conceptual Art",
        ],
    },
];

const currencies = [
    {
        code: "INR",
        name: "Indian Rupee",
        symbol: "₹",
        isActive: true,
    },
    {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        isActive: true,
    },
    {
        code: "EUR",
        name: "Euro",
        symbol: "€",
        isActive: true,
    },
    {
        code: "GBP",
        name: "British Pound Sterling",
        symbol: "£",
        isActive: true,
    },
    {
        code: "AED",
        name: "UAE Dirham",
        symbol: "د.إ",
        isActive: true,
    },
    {
        code: "SGD",
        name: "Singapore Dollar",
        symbol: "S$",
        isActive: true,
    },
    {
        code: "HKD",
        name: "Hong Kong Dollar",
        symbol: "HK$",
        isActive: true,
    },
];


const auctionTags = [
    {
        name: "Featured",
        slug: "featured",
        isActive: true,
    },
    {
        name: "New Arrival",
        slug: "new-arrival",
        isActive: true,
    },
    {
        name: "Modern Art",
        slug: "modern-art",
        isActive: true,
    },
    {
        name: "Contemporary Art",
        slug: "contemporary-art",
        isActive: true,
    },
    {
        name: "Indian Art",
        slug: "indian-art",
        isActive: true,
    },
    {
        name: "Fine Art",
        slug: "fine-art",
        isActive: true,
    },
    {
        name: "Painting",
        slug: "painting",
        isActive: true,
    },
    {
        name: "Sculpture",
        slug: "sculpture",
        isActive: true,
    },
    {
        name: "Photography",
        slug: "photography",
        isActive: true,
    },
    {
        name: "Limited Edition",
        slug: "limited-edition",
        isActive: true,
    },
    {
        name: "Rare",
        slug: "rare",
        isActive: true,
    },
    {
        name: "Collectible",
        slug: "collectible",
        isActive: true,
    },
    {
        name: "Emerging Artist",
        slug: "emerging-artist",
        isActive: true,
    },
    {
        name: "Masterpiece",
        slug: "masterpiece",
        isActive: true,
    },
    {
        name: "Online Auction",
        slug: "online-auction",
        isActive: true,
    },
];



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


    console.log("Seeding categories...");

    for (const categoryData of categories) {
        const { subCategories, ...category } = categoryData;

        const createdCategory = await prisma.category.upsert({
            where: {
                slug: category.slug,
            },
            update: {
                name: category.name,
                description: category.description,
                sortOrder: category.sortOrder,
                isActive: true,
            },
            create: {
                ...category,
            },
        });

        console.log(`Category: ${createdCategory.name}`);

        for (let index = 0; index < subCategories.length; index++) {
            const name = subCategories[index];

            const slug = name
                .toLowerCase()
                .replace(/&/g, "and")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            await prisma.subCategory.upsert({
                where: {
                    categoryId_slug: {
                        categoryId: createdCategory.id,
                        slug,
                    },
                },
                update: {
                    name,
                    isActive: true,
                    sortOrder: index + 1,
                },
                create: {
                    categoryId: createdCategory.id,
                    name,
                    slug,
                    sortOrder: index + 1,
                    isActive: true,
                },
            });
        }
    }

    console.log("Categories and subcategories seeded successfully.");


    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: {
                code: currency.code,
            },
            update: {
                name: currency.name,
                symbol: currency.symbol,
                isActive: currency.isActive,
            },
            create: currency,
        });

        console.log(`✓ ${currency.code} - ${currency.name}`);
    }

    console.log("Currency seeding completed.");


    console.log("\nSeeding auction tags...");

    for (const tag of auctionTags) {
        await prisma.auctionTag.upsert({
            where: {
                slug: tag.slug,
            },
            update: {
                name: tag.name,
                isActive: tag.isActive,
            },
            create: tag,
        });

        console.log(`✓ Tag: ${tag.name}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());