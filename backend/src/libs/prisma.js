import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

// The app talks to Postgres through DATABASE_URL — on Supabase, the transaction
// pooler (port 6543), which shares a few database connections among many clients.
// DIRECT_URL (session pooler, port 5432) is for migrations (prisma.config.ts); it
// allows only pool_size clients in total, so it's used here only as a fallback.
const pooledUrl = process.env.DATABASE_URL;
const connectionString = pooledUrl || process.env.DIRECT_URL;

// "?pgbouncer=true" is a flag for Prisma's old query engine — node-postgres doesn't use it
const toPgUrl = (value) => {
    try {
        const url = new URL(value);
        url.searchParams.delete("pgbouncer");
        return url.toString();
    } catch {
        return value;
    }
};

// keep well under the pooler's client limit; idle connections are given back quickly
const poolMax = Number(process.env.DB_POOL_MAX) || (pooledUrl ? 10 : 5);

console.log(
    `[prisma] connecting via ${pooledUrl ? "DATABASE_URL" : "DIRECT_URL"}:`,
    connectionString?.replace(/\/\/.*?:.*?@/, "//****:****@"),
    `(pool max ${poolMax})`
);

const adapter = new PrismaPg({
    connectionString: toPgUrl(connectionString),
    max: poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
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
