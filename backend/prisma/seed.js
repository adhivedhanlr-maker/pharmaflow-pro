const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Create User
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: 'hashed_password_here', // In real app, hash this with bcrypt
            name: 'Administrator',
            role: 'ADMIN',
        },
    });

    // 2. Create Customers
    await prisma.customer.createMany({
        data: [
            { name: 'Vikas Pharmacy', gstin: '27AAACN1234F1Z1', address: 'Sector 5, Pune', creditLimit: 50000 },
            { name: 'Apollo Meds Ltd', gstin: '27BBBDM5678G2Z2', address: 'Industrial Area, Pune', creditLimit: 200000 },
        ],
    });

    // 3. Create Suppliers
    await prisma.supplier.createMany({
        data: [
            { name: 'Cipla Pharmaceuticals', gstin: '27CIPLA1234X1Z0', address: 'Mumbai HQ' },
            { name: 'Sun Pharma', gstin: '27SUNP1234Y1Z1', address: 'Mumbai' },
        ],
    });

    // 4. Create Products and Batches
    const p1 = await prisma.product.create({
        data: {
            name: 'Paracetamol 500mg',
            hsnCode: '3004',
            gstRate: 12,
            mrp: 20,
            company: 'Cipla',
            reorderLevel: 100,
        },
    });

    await prisma.batch.createMany({
        data: [
            {
                batchNumber: 'BT123',
                expiryDate: new Date('2026-12-31'),
                productId: p1.id,
                currentStock: 500,
                purchasePrice: 10,
                salePrice: 15,
            },
            {
                batchNumber: 'BT124',
                expiryDate: new Date('2025-06-30'),
                productId: p1.id,
                currentStock: 200,
                purchasePrice: 9,
                salePrice: 14,
            },
        ],
    });

    const p2 = await prisma.product.create({
        data: {
            name: 'Amoxicillin 250mg',
            hsnCode: '3004',
            gstRate: 12,
            mrp: 45,
            company: 'Sun Pharma',
            reorderLevel: 50,
        },
    });

    await prisma.batch.create({
        data: {
            batchNumber: 'AX990',
            expiryDate: new Date('2025-03-15'),
            productId: p2.id,
            currentStock: 150,
            purchasePrice: 25,
            salePrice: 35,
        },
    });

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
