import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Realistic pharmaceutical products
const PRODUCTS = [
    { name: 'Paracetamol 500mg', manufacturer: 'Cipla', hsn: '30049099' },
    { name: 'Amoxicillin 250mg', manufacturer: 'Sun Pharma', hsn: '30042000' },
    { name: 'Azithromycin 500mg', manufacturer: 'Lupin', hsn: '30042000' },
    { name: 'Ciprofloxacin 500mg', manufacturer: 'Dr. Reddy\'s', hsn: '30042000' },
    { name: 'Metformin 500mg', manufacturer: 'USV', hsn: '30049099' },
    { name: 'Atorvastatin 10mg', manufacturer: 'Torrent', hsn: '30049099' },
    { name: 'Amlodipine 5mg', manufacturer: 'Alkem', hsn: '30049099' },
    { name: 'Omeprazole 20mg', manufacturer: 'Cadila', hsn: '30049099' },
    { name: 'Pantoprazole 40mg', manufacturer: 'Alembic', hsn: '30049099' },
    { name: 'Cetirizine 10mg', manufacturer: 'Mankind', hsn: '30049099' },
    { name: 'Montelukast 10mg', manufacturer: 'Glenmark', hsn: '30049099' },
    { name: 'Levocetrizine 5mg', manufacturer: 'Intas', hsn: '30049099' },
    { name: 'Diclofenac 50mg', manufacturer: 'Ipca', hsn: '30049099' },
    { name: 'Ibuprofen 400mg', manufacturer: 'Abbott', hsn: '30049099' },
    { name: 'Aspirin 75mg', manufacturer: 'Bayer', hsn: '30049099' },
    { name: 'Clopidogrel 75mg', manufacturer: 'Piramal', hsn: '30049099' },
    { name: 'Losartan 50mg', manufacturer: 'Micro Labs', hsn: '30049099' },
    { name: 'Telmisartan 40mg', manufacturer: 'Macleods', hsn: '30049099' },
    { name: 'Ramipril 5mg', manufacturer: 'Sanofi', hsn: '30049099' },
    { name: 'Glimepiride 2mg', manufacturer: 'Wockhardt', hsn: '30049099' },
    { name: 'Insulin Glargine 100IU', manufacturer: 'Biocon', hsn: '30043100' },
    { name: 'Salbutamol Inhaler', manufacturer: 'GSK', hsn: '30049099' },
    { name: 'Budesonide Inhaler', manufacturer: 'AstraZeneca', hsn: '30049099' },
    { name: 'Ranitidine 150mg', manufacturer: 'Aurobindo', hsn: '30049099' },
    { name: 'Domperidone 10mg', manufacturer: 'Ajanta', hsn: '30049099' },
    { name: 'Ondansetron 4mg', manufacturer: 'Natco', hsn: '30049099' },
    { name: 'Tramadol 50mg', manufacturer: 'Zydus', hsn: '30042000' },
    { name: 'Gabapentin 300mg', manufacturer: 'Hetero', hsn: '30049099' },
    { name: 'Pregabalin 75mg', manufacturer: 'Strides', hsn: '30049099' },
    { name: 'Vitamin D3 60000IU', manufacturer: 'Mankind', hsn: '30049099' },
    { name: 'Calcium Carbonate 500mg', manufacturer: 'Cipla', hsn: '30049099' },
    { name: 'Multivitamin Tablets', manufacturer: 'HealthKart', hsn: '30049099' },
    { name: 'Folic Acid 5mg', manufacturer: 'Sun Pharma', hsn: '30049099' },
    { name: 'Iron Tablets', manufacturer: 'Lupin', hsn: '30049099' },
    { name: 'Zinc Tablets 50mg', manufacturer: 'Dr. Reddy\'s', hsn: '30049099' },
    { name: 'Cough Syrup 100ml', manufacturer: 'Dabur', hsn: '30049099' },
    { name: 'Antacid Syrup 200ml', manufacturer: 'Himalaya', hsn: '30049099' },
    { name: 'Betadine Solution 100ml', manufacturer: 'Win Medicare', hsn: '30049099' },
    { name: 'Dettol Liquid 500ml', manufacturer: 'Reckitt', hsn: '30049099' },
    { name: 'Hand Sanitizer 500ml', manufacturer: 'Lifebuoy', hsn: '30049099' },
    { name: 'Surgical Mask (Box of 50)', manufacturer: '3M', hsn: '63079000' },
    { name: 'N95 Mask (Box of 20)', manufacturer: 'Venus', hsn: '63079000' },
    { name: 'Disposable Gloves (Box of 100)', manufacturer: 'Kimberly Clark', hsn: '40151900' },
    { name: 'Digital Thermometer', manufacturer: 'Omron', hsn: '90251100' },
    { name: 'BP Monitor', manufacturer: 'Dr. Morepen', hsn: '90189000' },
    { name: 'Glucometer', manufacturer: 'Accu-Chek', hsn: '90271000' },
    { name: 'Glucose Test Strips (50)', manufacturer: 'OneTouch', hsn: '90271000' },
    { name: 'Insulin Syringes (Box of 10)', manufacturer: 'BD', hsn: '90183100' },
    { name: 'Cotton Wool 100g', manufacturer: 'Johnson & Johnson', hsn: '30059000' },
    { name: 'Bandage Roll 6cm', manufacturer: 'Hansaplast', hsn: '30059000' },
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

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await prisma.saleReturnItem.deleteMany();
    await prisma.salesReturn.deleteMany();
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
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const admin = await prisma.user.create({
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
                manufacturer: prod.manufacturer,
                hsnCode: prod.hsn,
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

    // Create 100-150 purchases over 5 months
    for (let i = 0; i < 120; i++) {
        const supplier = suppliers[randomInt(0, suppliers.length - 1)];
        const purchaseDate = randomDate(startDate, endDate);
        const numItems = randomInt(3, 10);

        const purchaseItems = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = products[randomInt(0, products.length - 1)];
            const quantity = randomInt(50, 500);
            const purchasePrice = randomPrice(10, 500);
            const salePrice = purchasePrice * randomPrice(1.15, 1.40); // 15-40% markup
            const gstRate = 12;

            const expiryDate = new Date(purchaseDate);
            expiryDate.setMonth(expiryDate.getMonth() + randomInt(12, 36)); // 1-3 years expiry

            const batch = await prisma.batch.create({
                data: {
                    productId: product.id,
                    batchNumber: generateBatchNumber(),
                    expiryDate,
                    purchasePrice,
                    salePrice,
                    currentStock: quantity,
                    gstRate,
                },
            });
            batches.push(batch);

            purchaseItems.push({
                productId: product.id,
                batchId: batch.id,
                quantity,
                purchasePrice,
                gstRate,
            });

            totalAmount += quantity * purchasePrice * (1 + gstRate / 100);
        }

        await prisma.purchase.create({
            data: {
                supplierId: supplier.id,
                billNumber: `BILL-${Date.now()}-${i}`,
                totalAmount,
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
                    increment: totalAmount,
                },
            },
        });
    }

    console.log('💰 Creating sales (5 months)...');

    // Create 300-400 sales over 5 months
    for (let i = 0; i < 350; i++) {
        const customer = customers[randomInt(0, customers.length - 1)];
        const saleDate = randomDate(startDate, endDate);
        const numItems = randomInt(1, 8);
        const isCash = Math.random() > 0.3; // 70% cash, 30% credit

        const saleItems = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            // Pick a random batch that has stock
            const availableBatches = batches.filter(b => b.currentStock > 0);
            if (availableBatches.length === 0) continue;

            const batch = availableBatches[randomInt(0, availableBatches.length - 1)];
            const maxQty = Math.min(batch.currentStock, 50);
            const quantity = randomInt(1, maxQty);

            const unitPrice = batch.salePrice;
            const gstRate = batch.gstRate;

            saleItems.push({
                productId: batch.productId,
                batchId: batch.id,
                quantity,
                unitPrice,
                gstRate,
            });

            totalAmount += quantity * unitPrice * (1 + gstRate / 100);

            // Update batch stock
            batch.currentStock -= quantity;
            await prisma.batch.update({
                where: { id: batch.id },
                data: { currentStock: batch.currentStock },
            });
        }

        if (saleItems.length > 0) {
            await prisma.sale.create({
                data: {
                    customerId: customer.id,
                    invoiceNumber: `PF-${Date.now()}-${i}`,
                    totalAmount,
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
                            increment: totalAmount,
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

        await prisma.salesReturn.create({
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
    console.log(`   - 120 purchases`);
    console.log(`   - 350 sales`);
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
