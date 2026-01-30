import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Realistic pharmaceutical products
const PRODUCTS = [
    { name: 'Paracetamol 500mg', company: 'Cipla', hsn: '30049099', mrp: 15 },
    { name: 'Amoxicillin 250mg', company: 'Sun Pharma', hsn: '30042000', mrp: 120 },
    { name: 'Azithromycin 500mg', company: 'Lupin', hsn: '30042000', mrp: 250 },
    { name: 'Ciprofloxacin 500mg', company: 'Dr. Reddy\'s', hsn: '30042000', mrp: 180 },
    { name: 'Metformin 500mg', company: 'USV', hsn: '30049099', mrp: 45 },
    { name: 'Atorvastatin 10mg', company: 'Torrent', hsn: '30049099', mrp: 95 },
    { name: 'Amlodipine 5mg', company: 'Alkem', hsn: '30049099', mrp: 65 },
    { name: 'Omeprazole 20mg', company: 'Cadila', hsn: '30049099', mrp: 75 },
    { name: 'Pantoprazole 40mg', company: 'Alembic', hsn: '30049099', mrp: 85 },
    { name: 'Cetirizine 10mg', company: 'Mankind', hsn: '30049099', mrp: 25 },
    { name: 'Montelukast 10mg', company: 'Glenmark', hsn: '30049099', mrp: 145 },
    { name: 'Levocetrizine 5mg', company: 'Intas', hsn: '30049099', mrp: 55 },
    { name: 'Diclofenac 50mg', company: 'Ipca', hsn: '30049099', mrp: 35 },
    { name: 'Ibuprofen 400mg', company: 'Abbott', hsn: '30049099', mrp: 45 },
    { name: 'Aspirin 75mg', company: 'Bayer', hsn: '30049099', mrp: 25 },
    { name: 'Clopidogrel 75mg', company: 'Piramal', hsn: '30049099', mrp: 195 },
    { name: 'Losartan 50mg', company: 'Micro Labs', hsn: '30049099', mrp: 125 },
    { name: 'Telmisartan 40mg', company: 'Macleods', hsn: '30049099', mrp: 135 },
    { name: 'Ramipril 5mg', company: 'Sanofi', hsn: '30049099', mrp: 115 },
    { name: 'Glimepiride 2mg', company: 'Wockhardt', hsn: '30049099', mrp: 85 },
    { name: 'Insulin Glargine 100IU', company: 'Biocon', hsn: '30043100', mrp: 850 },
    { name: 'Salbutamol Inhaler', company: 'GSK', hsn: '30049099', mrp: 165 },
    { name: 'Budesonide Inhaler', company: 'AstraZeneca', hsn: '30049099', mrp: 285 },
    { name: 'Ranitidine 150mg', company: 'Aurobindo', hsn: '30049099', mrp: 35 },
    { name: 'Domperidone 10mg', company: 'Ajanta', hsn: '30049099', mrp: 45 },
    { name: 'Ondansetron 4mg', company: 'Natco', hsn: '30049099', mrp: 75 },
    { name: 'Tramadol 50mg', company: 'Zydus', hsn: '30042000', mrp: 95 },
    { name: 'Gabapentin 300mg', company: 'Hetero', hsn: '30049099', mrp: 125 },
    { name: 'Pregabalin 75mg', company: 'Strides', hsn: '30049099', mrp: 185 },
    { name: 'Vitamin D3 60000IU', company: 'Mankind', hsn: '30049099', mrp: 55 },
    { name: 'Calcium Carbonate 500mg', company: 'Cipla', hsn: '30049099', mrp: 65 },
    { name: 'Multivitamin Tablets', company: 'HealthKart', hsn: '30049099', mrp: 295 },
    { name: 'Folic Acid 5mg', company: 'Sun Pharma', hsn: '30049099', mrp: 25 },
    { name: 'Iron Tablets', company: 'Lupin', hsn: '30049099', mrp: 45 },
    { name: 'Zinc Tablets 50mg', company: 'Dr. Reddy\'s', hsn: '30049099', mrp: 35 },
    { name: 'Cough Syrup 100ml', company: 'Dabur', hsn: '30049099', mrp: 85 },
    { name: 'Antacid Syrup 200ml', company: 'Himalaya', hsn: '30049099', mrp: 95 },
    { name: 'Betadine Solution 100ml', company: 'Win Medicare', hsn: '30049099', mrp: 125 },
    { name: 'Dettol Liquid 500ml', company: 'Reckitt', hsn: '30049099', mrp: 145 },
    { name: 'Hand Sanitizer 500ml', company: 'Lifebuoy', hsn: '30049099', mrp: 95 },
    { name: 'Surgical Mask (Box of 50)', company: '3M', hsn: '63079000', mrp: 450 },
    { name: 'N95 Mask (Box of 20)', company: 'Venus', hsn: '63079000', mrp: 850 },
    { name: 'Disposable Gloves (Box of 100)', company: 'Kimberly Clark', hsn: '40151900', mrp: 650 },
    { name: 'Digital Thermometer', company: 'Omron', hsn: '90251100', mrp: 295 },
    { name: 'BP Monitor', company: 'Dr. Morepen', hsn: '90189000', mrp: 1250 },
    { name: 'Glucometer', company: 'Accu-Chek', hsn: '90271000', mrp: 950 },
    { name: 'Glucose Test Strips (50)', company: 'OneTouch', hsn: '90271000', mrp: 850 },
    { name: 'Insulin Syringes (Box of 10)', company: 'BD', hsn: '90183100', mrp: 185 },
    { name: 'Cotton Wool 100g', company: 'Johnson & Johnson', hsn: '30059000', mrp: 65 },
    { name: 'Bandage Roll 6cm', company: 'Hansaplast', hsn: '30059000', mrp: 45 },
];

const CUSTOMERS = [
    { name: 'City Medical Store', gstin: '27AABCU9603R1ZM', phone: '9876543210', address: 'Shop 12, MG Road, Mumbai' },
    { name: 'HealthCare Pharmacy', gstin: '29AABCU9603R1ZN', phone: '9876543211', address: '45, Brigade Road, Bangalore' },
    { name: 'Apollo Pharmacy', gstin: '33AABCU9603R1ZO', phone: '9876543212', address: '78, Anna Salai, Chennai' },
    { name: 'MedPlus', gstin: '36AABCU9603R1ZP', phone: '9876543213', address: '23, Banjara Hills, Hyderabad' },
    { name: 'Wellness Forever', gstin: '27AABCU9603R1ZQ', phone: '9876543214', address: '56, Andheri West, Mumbai' },
    { name: 'Guardian Pharmacy', gstin: '07AABCU9603R1ZR', phone: '9876543215', address: '89, Connaught Place, Delhi' },
    { name: 'Netmeds Retail', gstin: '33AABCU9603R1ZS', phone: '9876543216', address: '34, T Nagar, Chennai' },
    { name: 'PharmEasy Store', gstin: '27AABCU9603R1ZT', phone: '9876543217', address: '67, Powai, Mumbai' },
    { name: 'Cure Plus', gstin: '24AABCU9603R1ZU', phone: '9876543218', address: '12, Satellite, Ahmedabad' },
    { name: 'Medico Pharmacy', gstin: '19AABCU9603R1ZV', phone: '9876543219', address: '45, Park Street, Kolkata' },
    { name: 'Life Care Chemist', gstin: '29AABCU9603R1ZW', phone: '9876543220', address: '23, Indiranagar, Bangalore' },
    { name: 'Sai Medical', gstin: '27AABCU9603R1ZX', phone: '9876543221', address: '78, Thane West, Mumbai' },
    { name: 'Sunrise Pharmacy', gstin: '09AABCU9603R1ZY', phone: '9876543222', address: '56, Sector 18, Noida' },
    { name: 'Green Cross', gstin: '32AABCU9603R1ZZ', phone: '9876543223', address: '34, Ernakulam, Kochi' },
    { name: 'Remedy Pharmacy', gstin: '23AABCU9603R2ZA', phone: '9876543224', address: '89, Bhopal' },
    { name: 'Quick Heal Medical', gstin: '27AABCU9603R2ZB', phone: '9876543225', address: '12, Pune' },
    { name: 'Trust Pharmacy', gstin: '36AABCU9603R2ZC', phone: '9876543226', address: '45, Secunderabad' },
    { name: 'Care & Cure', gstin: '33AABCU9603R2ZD', phone: '9876543227', address: '67, Coimbatore' },
    { name: 'Medico Plus', gstin: '29AABCU9603R2ZE', phone: '9876543228', address: '23, Mysore' },
    { name: 'Health First', gstin: '07AABCU9603R2ZF', phone: '9876543229', address: '78, Gurgaon' },
];

const SUPPLIERS = [
    { name: 'Cipla Distributors', gstin: '27AABCS9603R1ZM', phone: '9123456780', address: 'Warehouse 1, Andheri, Mumbai' },
    { name: 'Sun Pharma Wholesale', gstin: '24AABCS9603R1ZN', phone: '9123456781', address: 'Plot 45, Ahmedabad' },
    { name: 'Lupin Supplies', gstin: '27AABCS9603R1ZO', phone: '9123456782', address: 'Godown 12, Thane' },
    { name: 'Dr. Reddy\'s Distribution', gstin: '36AABCS9603R1ZP', phone: '9123456783', address: 'Warehouse 5, Hyderabad' },
    { name: 'Torrent Pharma Supply', gstin: '24AABCS9603R1ZQ', phone: '9123456784', address: 'Unit 23, Surat' },
    { name: 'Alkem Distributors', gstin: '27AABCS9603R1ZR', phone: '9123456785', address: 'Godown 8, Mumbai' },
    { name: 'Mankind Wholesale', gstin: '07AABCS9603R1ZS', phone: '9123456786', address: 'Warehouse 15, Delhi' },
    { name: 'Glenmark Supplies', gstin: '27AABCS9603R1ZT', phone: '9123456787', address: 'Unit 34, Navi Mumbai' },
    { name: 'Abbott Distribution', gstin: '29AABCS9603R1ZU', phone: '9123456788', address: 'Warehouse 7, Bangalore' },
    { name: 'Medical Supplies Co.', gstin: '33AABCS9603R1ZV', phone: '9123456789', address: 'Godown 19, Chennai' },
];

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min: number, max: number) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateBatchNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const batch = letters.charAt(Math.floor(Math.random() * letters.length)) +
        letters.charAt(Math.floor(Math.random() * letters.length)) +
        randomInt(1000, 9999);
    return batch;
}

async function seed() {
    console.log('🌱 Starting seed...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.saleReturnItem.deleteMany();
    await prisma.saleReturn.deleteMany();
    await prisma.purchaseReturnItem.deleteMany();
    await prisma.purchaseReturn.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.businessProfile.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await prisma.user.create({
        data: {
            username: 'admin',
            password: hashedPassword,
            name: 'System Administrator',
            role: Role.ADMIN,
        },
    });

    await prisma.user.create({
        data: {
            username: 'billing1',
            password: hashedPassword,
            name: 'Rajesh Kumar',
            role: Role.BILLING_OPERATOR,
        },
    });

    await prisma.user.create({
        data: {
            username: 'warehouse1',
            password: hashedPassword,
            name: 'Suresh Patel',
            role: Role.WAREHOUSE_MANAGER,
        },
    });

    await prisma.user.create({
        data: {
            username: 'accountant1',
            password: hashedPassword,
            name: 'Priya Sharma',
            role: Role.ACCOUNTANT,
        },
    });

    await prisma.user.create({
        data: {
            username: 'sales1',
            password: hashedPassword,
            name: 'Amit Singh',
            role: Role.SALES_REP,
        },
    });

    // Create products
    console.log('💊 Creating products...');
    const products = [];
    for (const prod of PRODUCTS) {
        const product = await prisma.product.create({
            data: {
                name: prod.name,
                company: prod.company,
                hsnCode: prod.hsn,
                mrp: prod.mrp,
                gstRate: 12,
            },
        });
        products.push(product);
    }

    // Create customers
    console.log('🏪 Creating customers...');
    const customers = [];
    for (const cust of CUSTOMERS) {
        const customer = await prisma.customer.create({
            data: {
                name: cust.name,
                gstin: cust.gstin,
                phone: cust.phone,
                address: cust.address,
                currentBalance: 0,
            },
        });
        customers.push(customer);
    }

    // Create suppliers
    console.log('🏭 Creating suppliers...');
    const suppliers = [];
    for (const supp of SUPPLIERS) {
        const supplier = await prisma.supplier.create({
            data: {
                name: supp.name,
                gstin: supp.gstin,
                phone: supp.phone,
                address: supp.address,
                currentBalance: 0,
            },
        });
        suppliers.push(supplier);
    }

    // Generate 5 months of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);

    console.log('📦 Creating purchases (5 months)...');
    const batches = [];

    // Create 30 purchases over 5 months (reduced from 120)
    for (let i = 0; i < 30; i++) {
        const supplier = suppliers[randomInt(0, suppliers.length - 1)];
        const purchaseDate = randomDate(startDate, endDate);
        const numItems = randomInt(3, 10);

        const purchaseItems = [];

        for (let j = 0; j < numItems; j++) {
            const product = products[randomInt(0, products.length - 1)];
            const quantity = randomInt(50, 500);
            const purchasePrice = randomPrice(10, 500);
            const salePrice = purchasePrice * randomPrice(1.15, 1.40);
            const gstRate = 12;

            const expiryDate = new Date(purchaseDate);
            expiryDate.setMonth(expiryDate.getMonth() + randomInt(12, 36));

            const batch = await prisma.batch.create({
                data: {
                    productId: product.id,
                    batchNumber: generateBatchNumber(),
                    expiryDate,
                    purchasePrice,
                    salePrice,
                    currentStock: quantity,
                },
            });
            batches.push(batch);

            const gstAmount = (quantity * purchasePrice * gstRate) / 100;
            const itemTotalAmount = quantity * purchasePrice + gstAmount;

            purchaseItems.push({
                productId: product.id,
                batchId: batch.id,
                quantity,
                purchasePrice,
                gstRate,
                gstAmount,
                totalAmount: itemTotalAmount,
            });
        }

        const totalGrossAmount = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
        const totalGstAmount = purchaseItems.reduce((sum, item) => sum + item.gstAmount, 0);
        const netAmount = totalGrossAmount + totalGstAmount;

        await prisma.purchase.create({
            data: {
                supplierId: supplier.id,
                billNumber: `BILL-${Date.now()}-${i}`,
                totalAmount: totalGrossAmount,
                gstAmount: totalGstAmount,
                netAmount,
                createdAt: purchaseDate,
                items: {
                    create: purchaseItems,
                },
            },
        });

        // Update supplier balance
        await prisma.supplier.update({
            where: { id: supplier.id },
            data: {
                currentBalance: {
                    increment: netAmount,
                },
            },
        });
    }

    console.log('💰 Creating sales (5 months)...');

    // Create 50 sales over 5 months (reduced from 350)
    for (let i = 0; i < 50; i++) {
        const customer = customers[randomInt(0, customers.length - 1)];
        const saleDate = randomDate(startDate, endDate);
        const numItems = randomInt(1, 8);
        const isCash = Math.random() > 0.3;

        const saleItems = [];

        for (let j = 0; j < numItems; j++) {
            const availableBatches = batches.filter(b => b.currentStock > 0);
            if (availableBatches.length === 0) continue;

            const batch = availableBatches[randomInt(0, availableBatches.length - 1)];
            const maxQty = Math.min(batch.currentStock, 50);
            const quantity = randomInt(1, maxQty);

            const unitPrice = batch.salePrice;
            const gstRate = 12;
            const gstAmount = (quantity * unitPrice * gstRate) / 100;
            const itemTotal = quantity * unitPrice + gstAmount;

            saleItems.push({
                productId: batch.productId,
                batchId: batch.id,
                quantity,
                unitPrice,
                gstRate,
                gstAmount,
                totalAmount: itemTotal,
            });

            // Update batch stock
            batch.currentStock -= quantity;
            await prisma.batch.update({
                where: { id: batch.id },
                data: { currentStock: batch.currentStock },
            });
        }

        if (saleItems.length > 0) {
            const totalGrossAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const totalGstAmount = saleItems.reduce((sum, item) => sum + item.gstAmount, 0);
            const netAmount = totalGrossAmount + totalGstAmount;

            await prisma.sale.create({
                data: {
                    customerId: customer.id,
                    invoiceNumber: `PF-${Date.now()}-${i}`,
                    totalAmount: totalGrossAmount,
                    gstAmount: totalGstAmount,
                    netAmount,
                    isCash,
                    createdAt: saleDate,
                    items: {
                        create: saleItems,
                    },
                },
            });

            // Update customer balance if credit
            if (!isCash) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        currentBalance: {
                            increment: netAmount,
                        },
                    },
                });
            }
        }
    }

    console.log('🔄 Creating returns (sample)...');

    // Create some sales returns (5-10)
    const sales = await prisma.sale.findMany({
        include: { items: true },
        take: 10,
    });

    for (let i = 0; i < 5; i++) {
        const sale = sales[i];
        if (!sale || sale.items.length === 0) continue;

        const returnItem = sale.items[0];
        const returnQty = Math.min(returnItem.quantity, randomInt(1, 5));

        const returnAmount = returnQty * returnItem.unitPrice * (1 + returnItem.gstRate / 100);

        await prisma.saleReturn.create({
            data: {
                saleId: sale.id,
                totalAmount: returnAmount,
                items: {
                    create: [{
                        saleItemId: returnItem.id,
                        quantity: returnQty,
                        reason: 'Damaged product',
                    }],
                },
            },
        });

        // Restore stock
        await prisma.batch.update({
            where: { id: returnItem.batchId },
            data: {
                currentStock: {
                    increment: returnQty,
                },
            },
        });

        // Adjust customer balance
        if (!sale.isCash) {
            await prisma.customer.update({
                where: { id: sale.customerId },
                data: {
                    currentBalance: {
                        decrement: returnAmount,
                    },
                },
            });
        }
    }

    console.log('✅ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${suppliers.length} suppliers`);
    console.log(`   - ${batches.length} batches`);
    console.log(`   - 30 purchases`);
    console.log(`   - 50 sales`);
    console.log(`   - 5 returns`);
    console.log(`   - 5 users (admin/Admin@123, billing1/Admin@123, etc.)`);
}

seed()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
