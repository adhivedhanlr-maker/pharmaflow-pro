import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkZain() {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: { name: { contains: 'zain', mode: 'insensitive' } },
            include: {
                purchases: true,
            }
        });

        const customers = await prisma.customer.findMany({
            where: { name: { contains: 'zain', mode: 'insensitive' } },
            include: {
                sales: true,
                visits: true,
                orders: true,
            }
        });

        console.log('Suppliers matching zain:', JSON.stringify(suppliers, null, 2));
        console.log('Customers matching zain:', JSON.stringify(customers, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkZain();
