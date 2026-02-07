import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding demo route data...');

    // 1. Find or create a Sales Rep
    let rep = await prisma.user.findFirst({
        where: { role: 'SALES_REP' }
    });

    if (!rep) {
        console.log('No Sales Rep found. Creating one...');
        rep = await prisma.user.create({
            data: {
                username: 'demorep',
                password: 'password123', // In a real app this should be hashed
                name: 'Demo Cloud Rep',
                role: 'SALES_REP'
            }
        });
    }

    console.log(`Using Rep: ${rep.name} (${rep.id})`);

    // 2. Find or create some customers
    const customersData = [
        { name: 'City Pharmacy', lat: 12.9716, lng: 77.5946 }, // Majestic
        { name: 'Health Plus', lat: 12.9783, lng: 77.6050 },   // MG Road
        { name: 'Care Chemist', lat: 12.9796, lng: 77.6185 },  // Indiranagar
        { name: 'Life Line Meds', lat: 12.9352, lng: 77.6245 }, // Koramangala
        { name: 'Wellness Store', lat: 12.9250, lng: 77.5938 }, // Jayanagar
    ];

    const customers = [];
    for (const c of customersData) {
        let customer = await prisma.customer.findFirst({ where: { name: c.name } });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: c.name,
                    address: 'Bangalore',
                    latitude: c.lat,
                    longitude: c.lng
                }
            });
        }
        customers.push(customer);
    }

    // 3. Create Visits for Today
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Start at 9 AM

    for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        const visitTime = new Date(today);
        visitTime.setMinutes(visitTime.getMinutes() + (i * 60)); // 1 hour apart

        await prisma.visit.create({
            data: {
                repId: rep.id,
                customerId: customer.id,
                checkInTime: visitTime,
                latitude: customer.latitude || 0,
                longitude: customer.longitude || 0,
                distance: 10,
                status: 'VERIFIED'
            }
        });
        console.log(`Created visit at ${customer.name} at ${visitTime.toLocaleTimeString()}`);
    }

    console.log('Demo data seeded successfully!');
    console.log(`NOTE: Select Date: ${today.toISOString().split('T')[0]} and Rep: ${rep.name} to view the route.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
