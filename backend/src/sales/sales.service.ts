import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
    constructor(private prisma: PrismaService) { }

    async createInvoice(data: any, userId?: string) {
        const { customerId, items, isCash, discountAmount = 0 } = data;
        const finalUserId = userId || (await this.prisma.user.findFirst())?.id;
        if (!finalUserId) throw new BadRequestException('No default user found for invoice creation');

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Customer
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer) throw new NotFoundException('Customer not found');

            let totalAmount = 0;
            let totalGst = 0;

            const invoiceItems = [];

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                // 2. Batch Selection (FEFO if not specified)
                let batch;
                if (item.batchId) {
                    batch = await tx.batch.findUnique({ where: { id: item.batchId } });
                } else {
                    // Auto-select batch with earliest expiry that has stock
                    batch = await tx.batch.findFirst({
                        where: {
                            productId: item.productId,
                            currentStock: { gte: item.quantity },
                            expiryDate: { gt: new Date() },
                        },
                        orderBy: { expiryDate: 'asc' },
                    });
                }

                if (!batch || batch.currentStock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for product ${product.name}`);
                }

                // 3. Calculate Item Totals
                const itemTotal = item.quantity * batch.salePrice;
                const itemGst = (itemTotal * product.gstRate) / 100;

                totalAmount += itemTotal;
                totalGst += itemGst;

                // 4. Update Stock
                await tx.batch.update({
                    where: { id: batch.id },
                    data: { currentStock: { decrement: item.quantity } },
                });

                invoiceItems.push({
                    productId: product.id,
                    batchId: batch.id,
                    quantity: item.quantity,
                    unitPrice: batch.salePrice,
                    gstRate: product.gstRate,
                    gstAmount: itemGst,
                    totalAmount: itemTotal + itemGst,
                });
            }

            const netAmount = totalAmount + totalGst - discountAmount;

            // 5. Update Customer Balance if Credit
            if (!isCash) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: { currentBalance: { increment: netAmount } },
                });
            }

            // 6. Create Invoice
            const invoiceNumber = `INV-${Date.now()}`; // Simple generator for now

            return tx.sale.create({
                data: {
                    invoiceNumber,
                    customerId,
                    userId,
                    totalAmount,
                    gstAmount: totalGst,
                    netAmount,
                    discountAmount,
                    isCash,
                    items: {
                        create: invoiceItems,
                    },
                },
                include: {
                    items: true,
                    customer: true,
                },
            });
        });
    }

    async findAll() {
        return this.prisma.sale.findMany({
            include: {
                customer: true,
                items: { include: { product: true, batch: true } },
                user: { select: { name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
