import prisma from "../libs/prisma.js";


export const getCurrencies = async (req, res) => {
    try {
        const currencies = await prisma.currency.findMany({
            where: { isActive: true },
            select: { code: true, name: true, symbol: true },
            orderBy: { code: "asc" },
        });


        currencies.sort((a, b) => (a.code === "INR" ? -1 : b.code === "INR" ? 1 : 0));

        return res.status(200).json({
            success: true,
            message: "Currencies fetched successfully",
            data: currencies,
        });
    } catch (error) {
        console.error("Get currencies error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch currencies",
        });
    }
};