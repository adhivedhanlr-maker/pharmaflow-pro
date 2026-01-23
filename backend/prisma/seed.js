const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data to Neon PostgreSQL...');

    // 1. Create Admin User with proper hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: hashedPassword,
        },
        create: {
            username: 'admin',
            password: hashedPassword,
            name: 'Administrator',
            role: 'ADMIN',
        },
    });

    console.log('Admin user created/updated.');

    // 2. Create Sample Customers
    await prisma.customer.createMany({
        skipDuplicates: true,
        data: [
            { id: 'cust_1', name: 'Vikas Pharmacy', gstin: '27AAACN1234F1Z1', address: 'Sector 5, Pune', creditLimit: 50000 },
            { id: 'cust_2', name: 'Apollo Meds Ltd', gstin: '27BBBDM5678G2Z2', address: 'Industrial Area, Pune', creditLimit: 200000 },
        ],
    });

    // 3. Create Sample Suppliers
    await prisma.supplier.createMany({
        skipDuplicates: true,
        data: [
            { id: 'sup_1', name: 'Cipla Pharmaceuticals', gstin: '27CIPLA1234X1Z0', address: 'Mumbai HQ' },
            { id: 'sup_2', name: 'Sun Pharma', gstin: '27SUNP1234Y1Z1', address: 'Mumbai' },
        ],
    });

    // 4. Create Sample Products
    const p1 = await prisma.product.upsert({
        where: { id: 'prod_1' },
        update: {},
        create: {
            id: 'prod_1',
            name: 'Paracetamol 500mg',
            hsnCode: '3004',
            gstRate: 12,
            mrp: 20,
            company: 'Cipla',
            reorderLevel: 100,
        },
    });

    const p2 = await prisma.product.upsert({
        where: { id: 'prod_2' },
        update: {},
        create: {
            id: 'prod_2',
            name: 'Amoxicillin 250mg',
            hsnCode: '3004',
            gstRate: 12,
            mrp: 45,
            company: 'Sun Pharma',
            reorderLevel: 50,
        },
    });

    // 5. Create Sample Batches
    await prisma.batch.upsert({
        where: { productId_batchNumber: { productId: p1.id, batchNumber: 'BT123' } },
        update: {},
        create: {
            batchNumber: 'BT123',
            expiryDate: new Date('2026-12-31'),
            productId: p1.id,
            currentStock: 500,
            purchasePrice: 10,
            salePrice: 15,
        },
    });

    await prisma.batch.upsert({
        where: { productId_batchNumber: { productId: p2.id, batchNumber: 'AX990' } },
        update: {},
        create: {
            batchNumber: 'AX990',
            expiryDate: new Date('2025-03-15'),
            productId: p2.id,
            currentStock: 150,
            purchasePrice: 25,
            salePrice: 35,
        },
    });

    console.log('Seeding complete. Use username: admin, password: admin123');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
