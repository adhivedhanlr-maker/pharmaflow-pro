import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReturnsService {
    constructor(private prisma: PrismaService) { }

    async createSalesReturn(data: any, tenantId: string) {
        const { saleId, items, returnType } = data;
        const isDamagedOrExpired = returnType === 'DAMAGED' || returnType === 'EXPIRED';

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Sale belongs to this tenant
            const sale = await tx.sale.findFirst({
                where: { id: saleId, tenantId },
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

                // 2. For normal returns, put the item back in stock.
                // Damaged/expired returns are not restocked.
                if (!isDamagedOrExpired) {
                    await tx.batch.update({
                        where: { id: saleItem.batchId },
                        data: { currentStock: { increment: item.quantity } },
                    });
                }

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
                    tenantId,
                    totalAmount: refundAmount,
                    items: {
                        create: items.map((item: any) => ({
                            saleItemId: item.saleItemId,
                            tenantId,
                            quantity: item.quantity,
                            reason: item.reason || (isDamagedOrExpired ? (returnType === 'DAMAGED' ? 'Damaged Return' : 'Expired Return') : undefined),
                        })),
                    },
                },
                include: {
                    items: { include: { saleItem: { include: { product: true, batch: true } } } },
                    sale: { include: { customer: true } },
                },
            });
        });
    }

    async createPurchaseReturn(data: any, tenantId: string) {
        const { purchaseId, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Purchase belongs to this tenant
            const purchase = await tx.purchase.findFirst({
                where: { id: purchaseId, tenantId },
                include: { items: true, supplier: true },
            });
            if (!purchase) throw new NotFoundException('Purchase not found');

            let debitAmount = 0;

            for (const item of items) {
                const purchaseItem = purchase.items.find((pi) => pi.id === item.purchaseItemId);
                if (!purchaseItem) throw new BadRequestException(`Item ${item.purchaseItemId} not part of this purchase`);

                // 2. Reduce stock from batch (tenant-scoped)
                const batch = await tx.batch.findFirst({ where: { id: purchaseItem.batchId, tenantId } });
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
                    tenantId,
                    totalAmount: debitAmount,
                    items: {
                        create: items.map((item: any) => ({
                            purchaseItemId: item.purchaseItemId,
                            tenantId,
                            quantity: item.quantity,
                            reason: item.reason,
                        })),
                    },
                },
                include: {
                    items: { include: { purchaseItem: { include: { product: true, batch: true } } } },
                    purchase: { include: { supplier: true } },
                },
            });
        });
    }

    async getSaleForReturn(invoiceNumber: string, tenantId: string) {
        const sale = await this.prisma.sale.findFirst({
            where: { invoiceNumber, tenantId },
            include: {
                customer: true,
                items: {
                    include: {
                        batch: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        if (!sale) {
            throw new NotFoundException('Invoice not found');
        }

        return sale;
    }

    async getPurchaseForReturn(billNumber: string, tenantId: string) {
        const purchase = await this.prisma.purchase.findFirst({
            where: { billNumber, tenantId },
            include: {
                supplier: true,
                items: {
                    include: {
                        batch: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        if (!purchase) {
            throw new NotFoundException('Purchase bill not found');
        }

        return purchase;
    }

    async findAllCreditNotes(tenantId?: string) {
        if (!tenantId) return [];

        return this.prisma.saleReturn.findMany({
            where: { tenantId },
            include: {
                sale: { include: { customer: true } },
                items: { include: { saleItem: { include: { product: true, batch: true } } } },
            },
            orderBy: { date: 'desc' },
        });
    }

    async findCreditNoteById(id: string, tenantId: string) {
        const creditNote = await this.prisma.saleReturn.findFirst({
            where: { id, tenantId },
            include: {
                sale: { include: { customer: true } },
                items: { include: { saleItem: { include: { product: true, batch: true } } } },
            },
        });

        if (!creditNote) {
            throw new NotFoundException('Credit note not found');
        }

        return creditNote;
    }

    async findAllDebitNotes(tenantId?: string) {
        if (!tenantId) return [];

        return this.prisma.purchaseReturn.findMany({
            where: { tenantId },
            include: {
                purchase: { include: { supplier: true } },
                items: { include: { purchaseItem: { include: { product: true, batch: true } } } },
            },
            orderBy: { date: 'desc' },
        });
    }

    async findDebitNoteById(id: string, tenantId: string) {
        const debitNote = await this.prisma.purchaseReturn.findFirst({
            where: { id, tenantId },
            include: {
                purchase: { include: { supplier: true } },
                items: { include: { purchaseItem: { include: { product: true, batch: true } } } },
            },
        });

        if (!debitNote) {
            throw new NotFoundException('Debit note not found');
        }

        return debitNote;
    }
}
