import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// Prisma Singleton — persisted on globalThis in ALL environments.
//
// WHY: In serverless / edge environments (Vercel, Railway, etc.) each
// request can spin up a new Node.js context. Without this guard, a fresh
// PrismaClient (and a fresh DB connection) would be created per request,
// burning Neon compute hours and hitting connection limits.
//
// connection_limit=3 is intentional for Neon free tier (max 5 connections).
// ─────────────────────────────────────────────────────────────────────────

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
        // Keep connection pool small for Neon free tier
        // Prevents "too many connections" and minimises compute-unit burn
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Always reuse the global instance — critical for production serverless hosts
const prisma = globalThis.prisma ?? prismaClientSingleton();
globalThis.prisma = prisma;

export default prisma;
