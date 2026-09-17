import prisma from '../libs/prisma.js';


export const getAllCategories = async () => {
    return await prisma.category.findMany({
        where: {
            isActive: true
        },
        orderBy: {
            sortOrder: "asc"
        },
        select: {
            uuid: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            sortOrder: true
        }
    })
}


export const getCategoryByUuid = async (uuid) => {
    return await prisma.category.findUnique({
        where: {
            uuid,
        },
        select: {
            uuid: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            sortOrder: true,
            isActive: true,

            subCategories: {
                where: {
                    isActive: true,
                },
                orderBy: {
                    sortOrder: "asc",
                },
                select: {
                    uuid: true,
                    name: true,
                    slug: true,
                    description: true,
                    imageUrl: true,
                    sortOrder: true,
                },
            },
        },
    });
};


export const getSubCategoriesByCategoryUuid = async (uuid) => {
    return await prisma.subCategory.findMany({
        where: {
            category: {
                uuid,
                isActive: true,
            },
            isActive: true,
        },
        orderBy: {
            sortOrder: "asc",
        },
        select: {
            uuid: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            sortOrder: true,
        },
    });
};