import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
    constructor(private prisma: PrismaService) { }

    async createPurchase(data: any) {
        const { supplierId, billNumber, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Supplier
            const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
            if (!supplier) throw new NotFoundException('Supplier not found');

            let totalAmount = 0;
            let totalGst = 0;

            const purchaseItems = [];

            for (const item of items) {
                // 2. Upsert Product/Batch
                let product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                // Check if batch exists or create new
                let batch = await tx.batch.findUnique({
                    where: {
                        productId_batchNumber: {
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                        },
                    },
                });

                if (batch) {
                    // Update existing batch stock and prices
                    batch = await tx.batch.update({
                        where: { id: batch.id },
                        data: {
                            currentStock: { increment: item.quantity },
                            purchasePrice: item.purchasePrice,
                            salePrice: item.salePrice,
                            expiryDate: new Date(item.expiryDate),
                        },
                    });
                } else {
                    // Create new batch
                    batch = await tx.batch.create({
                        data: {
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                            expiryDate: new Date(item.expiryDate),
                            currentStock: item.quantity,
                            purchasePrice: item.purchasePrice,
                            salePrice: item.salePrice,
                        },
                    });
                }

                const itemTotal = item.quantity * item.purchasePrice;
                const itemGst = (itemTotal * product.gstRate) / 100;

                totalAmount += itemTotal;
                totalGst += itemGst;

                purchaseItems.push({
                    productId: product.id,
                    batchId: batch.id,
                    quantity: item.quantity,
                    purchasePrice: item.purchasePrice,
                    gstRate: product.gstRate,
                    gstAmount: itemGst,
                    totalAmount: itemTotal + itemGst,
                });
            }

            const netAmount = totalAmount + totalGst;

            // 3. Update Supplier Balance
            await tx.supplier.update({
                where: { id: supplierId },
                data: { currentBalance: { increment: netAmount } },
            });

            // 4. Create Purchase Record
            return tx.purchase.create({
                data: {
                    billNumber,
                    supplierId,
                    totalAmount,
                    gstAmount: totalGst,
                    netAmount,
                    items: {
                        create: purchaseItems,
                    },
                },
                include: {
                    items: true,
                    supplier: true,
                },
            });
        });
    }

    async findAll() {
        return this.prisma.purchase.findMany({
            include: { supplier: true, items: { include: { product: true, batch: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}
