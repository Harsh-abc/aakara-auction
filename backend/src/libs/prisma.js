import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;
console.log(
    "DIRECT_URL exists:",
    Boolean(process.env.DIRECT_URL)
);

console.log(
    "DIRECT_URL host:",
    process.env.DIRECT_URL
        ?.replace(/\/\/.*?:.*?@/, "//****:****@")
);
const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL,
});

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
