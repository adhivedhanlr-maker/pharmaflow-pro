import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to database...");

    // 1. Get first available Customer
    const customer = await prisma.customer.findFirst();
    if (!customer) {
        throw new Error("No customers found! Please create a customer first.");
    }
    console.log(`Found Customer: ${customer.name} (${customer.id})`);

    // 2. Get first available User (to assign as Rep)
    const user = await prisma.user.findFirst();
    if (!user) {
        throw new Error("No users found! Please create a user first.");
    }
    console.log(`Found User/Rep: ${user.name} (${user.role})`);

    // 3. Create a Test Invoice
    const invoiceNumber = `INV-TEST-${Date.now().toString().slice(-6)}`;
    const otp = "123456"; // Fixed OTP for easy testing

    const sale = await prisma.sale.create({
        data: {
            invoiceNumber,
            customerId: customer.id,
            userId: user.id,
            repId: user.id, // Assign to this user so it appears in their app
            totalAmount: 100.0,
            gstAmount: 18.0,
            netAmount: 118.0,
            discountAmount: 0,
            isCash: true,
            deliveryStatus: 'PENDING',
            deliveryOtp: otp,
            items: {
                create: [] // Empty items for simplicity, or we can add one if needed
            }
        }
    });

    console.log("\n====== TEST INVOICE CREATED ======");
    console.log(`Invoice Number: ${sale.invoiceNumber}`);
    console.log(`Customer: ${customer.name}`);
    console.log(`Assigned Rep: ${user.name}`);
    console.log(`Delivery OTP: ${sale.deliveryOtp}`);
    console.log("==================================\n");
    console.log("Please refresh your mobile app to see this delivery.");
}

main()
    .catch(e => {
        console.error("Error creating invoice:", e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
