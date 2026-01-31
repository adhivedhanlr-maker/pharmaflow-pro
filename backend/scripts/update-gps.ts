import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating customers with real coordinates for Nileshwar, Kasaragod...');

    // Nileshwar coords: Lat: 12.2557161, Lng: 75.1340652
    const customers = await prisma.customer.updateMany({
        data: {
            latitude: 12.2557161,
            longitude: 75.1340652
        }
    });

    console.log(`Updated ${customers.count} customers with real GPS coordinates.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
