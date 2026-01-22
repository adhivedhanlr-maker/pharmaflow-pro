import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReturnsService {
    constructor(private prisma: PrismaService) { }

    async createSalesReturn(data: any) {
        const { saleId, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Sale
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { items: true, customer: true },
            });
            if (!sale) throw new NotFoundException('Sale not found');

            let refundAmount = 0;

            for (const item of items) {
                const saleItem = sale.items.find((si) => si.id === item.saleItemId);
                if (!saleItem) throw new BadRequestException(`Item ${item.saleItemId} not part of this sale`);

                if (item.quantity > saleItem.quantity) {
                    throw new BadRequestException(`Cannot return more than sold for item ${item.saleItemId}`);
                }

                // 2. Add stock back to batch
                await tx.batch.update({
                    where: { id: saleItem.batchId },
                    data: { currentStock: { increment: item.quantity } },
                });

                const itemRefund = item.quantity * saleItem.unitPrice;
                const itemGstRefund = (itemRefund * saleItem.gstRate) / 100;
                refundAmount += (itemRefund + itemGstRefund);
            }

            // 3. Update Customer Balance (Credit Note)
            if (sale.customerId) {
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { currentBalance: { decrement: refundAmount } },
                });
            }

            // 4. Create Return Record
            return tx.saleReturn.create({
                data: {
                    saleId,
                    totalAmount: refundAmount,
                    items: {
                        create: items.map((item: any) => ({
                            saleItemId: item.saleItemId,
                            quantity: item.quantity,
                            reason: item.reason,
                        })),
                    },
                },
                include: { items: true },
            });
        });
    }

    async createPurchaseReturn(data: any) {
        const { purchaseId, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Purchase
            const purchase = await tx.purchase.findUnique({
                where: { id: purchaseId },
                include: { items: true, supplier: true },
            });
            if (!purchase) throw new NotFoundException('Purchase not found');

            let debitAmount = 0;

            for (const item of items) {
                const purchaseItem = purchase.items.find((pi) => pi.id === item.purchaseItemId);
                if (!purchaseItem) throw new BadRequestException(`Item ${item.purchaseItemId} not part of this purchase`);

                // 2. Reduce stock from batch
                const batch = await tx.batch.findUnique({ where: { id: purchaseItem.batchId } });
                if (!batch || batch.currentStock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock in batch for return of item ${item.purchaseItemId}`);
                }

                await tx.batch.update({
                    where: { id: purchaseItem.batchId },
                    data: { currentStock: { decrement: item.quantity } },
                });

                debitAmount += item.quantity * purchaseItem.purchasePrice * (1 + (purchaseItem.gstRate / 100));
            }

            // 3. Update Supplier Balance (Debit Note)
            await tx.supplier.update({
                where: { id: purchase.supplierId },
                data: { currentBalance: { decrement: debitAmount } },
            });

            // 4. Create Purchase Return Record
            return tx.purchaseReturn.create({
                data: {
                    purchaseId,
                    totalAmount: debitAmount,
                    items: {
                        create: items.map((item: any) => ({
                            purchaseItemId: item.purchaseItemId,
                            quantity: item.quantity,
                            reason: item.reason,
                        })),
                    },
                },
                include: { items: true },
            });
        });
    }
}
