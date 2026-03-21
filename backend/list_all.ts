import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                tenantId: true,
                role: true
            }
        });
        console.log("ALL users in database:");
        console.table(users);

        const tenants = await prisma.tenantBranding.findMany({
            select: { id: true, companyName: true, slug: true }
        });
        console.log("\nTenants in database:");
        console.table(tenants);

    } catch (e) {
        console.error("Error connecting to database:", e);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
