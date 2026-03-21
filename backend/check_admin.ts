import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                username: true,
                tenantId: true,
                role: true
            }
        });
        console.log("Current users in database:");
        console.table(users);

        const adminUser = await prisma.user.findFirst({
            where: { username: "admin" }
        });
        
        if (adminUser) {
            console.log("\nWARNING: An 'admin' user already exists!");
            console.log("TenantId:", adminUser.tenantId);
        } else {
            console.log("\nOK: No 'admin' user found.");
        }
    } catch (e) {
        console.error("Error connecting to database:", e);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
