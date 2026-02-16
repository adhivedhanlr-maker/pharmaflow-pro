import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const sales = await prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            customer: true,
            rep: true,
            user: true
        },
        where: {
            deliveryStatus: 'PENDING'
        }
    });

    console.log("\n====== ALL PENDING DELIVERIES ======");
    if (sales.length === 0) {
        console.log("No pending deliveries found in the database.");
    }
    sales.forEach(sale => {
        const repName = sale.rep?.name || sale.user?.name || "Unassigned";
        console.log(`Invoice: ${sale.invoiceNumber} | Customer: ${sale.customer.name}`);
        console.log(`Rep: ${repName} | Amount: ${sale.netAmount} | OTP: ${sale.deliveryOtp}`);
        console.log('-----------------------------------');
    });
    console.log("===================================\n");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
