import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    async findAllBatches(tenantId: string) {
        return this.prisma.batch.findMany({
            where: { tenantId },
            include: { product: true },
            orderBy: { expiryDate: 'asc' },
        });
    }

    async updateStockManual(batchId: string, quantity: number, _reason: string, tenantId: string, pricing?: {
        salePrice?: number;
        purchasePrice?: number;
        mrp?: number;
        ptr?: number;
        pts?: number;
        nr?: number;
    }) {
        if (quantity < 0) throw new NotFoundException('Stock quantity cannot be negative');
        const batch = await this.prisma.batch.findFirst({ where: { id: batchId, tenantId } });
        if (!batch) throw new NotFoundException('Batch not found');

        const previousStock = batch.currentStock;
        const updated = await this.prisma.batch.update({
            where: { id: batchId },
            data: {
                currentStock: quantity,
                ...(pricing?.salePrice !== undefined && { salePrice: pricing.salePrice }),
                ...(pricing?.purchasePrice !== undefined && { purchasePrice: pricing.purchasePrice }),
                ...(pricing?.mrp !== undefined && { mrp: pricing.mrp }),
                ...(pricing?.ptr !== undefined && { ptr: pricing.ptr }),
                ...(pricing?.pts !== undefined && { pts: pricing.pts }),
                ...(pricing?.nr !== undefined && { nr: pricing.nr }),
            },
            include: { product: true },
        });
        return { ...updated, previousStock };
    }

    async getStockLedger(tenantId: string, productId?: string, batchId?: string) {
        const batchWhere: any = { tenantId };
        if (batchId) batchWhere.id = batchId;
        else if (productId) batchWhere.productId = productId;

        // Fetch all matching batches (for product/batch selector and opening balance context)
        const batches = await this.prisma.batch.findMany({
            where: batchWhere,
            include: { product: true, supplier: { select: { name: true } } },
        });

        if (batches.length === 0) return { batches: [], movements: [] };

        const batchIds = batches.map(b => b.id);

        // Purchase movements (stock IN)
        const purchaseItems = await this.prisma.purchaseItem.findMany({
            where: { batchId: { in: batchIds }, tenantId },
            include: {
                purchase: { include: { supplier: { select: { name: true } } } },
                product: { select: { name: true, company: true } },
                batch: { select: { batchNumber: true, expiryDate: true } },
            },
            orderBy: { purchase: { date: 'asc' } },
        });

        // Sale movements (stock OUT)
        const saleItems = await this.prisma.saleItem.findMany({
            where: { batchId: { in: batchIds }, tenantId },
            include: {
                sale: { include: { customer: { select: { name: true } } } },
                product: { select: { name: true, company: true } },
                batch: { select: { batchNumber: true, expiryDate: true } },
            },
            orderBy: { sale: { date: 'asc' } },
        });

        // Merge into unified movement list
        const movements: any[] = [
            ...purchaseItems.map(item => ({
                id: item.id,
                type: 'PURCHASE' as const,
                date: item.purchase.date,
                party: item.purchase.supplier?.name || 'Unknown Supplier',
                reference: item.purchase.billNumber,
                productName: item.product.name,
                productCompany: item.product.company,
                batchId: item.batchId,
                batchNumber: item.batch.batchNumber,
                expiryDate: item.batch.expiryDate,
                quantityIn: item.quantity + (item.freeQty || 0),
                quantityOut: 0,
            })),
            ...saleItems.map(item => ({
                id: item.id,
                type: 'SALE' as const,
                date: item.sale.date,
                party: item.sale.customer?.name || 'Unknown Customer',
                reference: item.sale.invoiceNumber,
                productName: item.product.name,
                productCompany: item.product.company,
                batchId: item.batchId,
                batchNumber: item.batch.batchNumber,
                expiryDate: item.batch.expiryDate,
                quantityIn: 0,
                quantityOut: item.quantity + (item.freeQuantity || 0),
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Compute running balance per batch
        const balanceByBatch: Record<string, number> = {};
        const movementsWithBalance = movements.map(m => {
            if (!(m.batchId in balanceByBatch)) balanceByBatch[m.batchId] = 0;
            balanceByBatch[m.batchId] += m.quantityIn - m.quantityOut;
            return { ...m, balance: balanceByBatch[m.batchId] };
        });

        return { batches, movements: movementsWithBalance };
    }

    async getStockAlerts(tenantId: string) {
        const lowStock = await this.prisma.product.findMany({
            where: {
                tenantId,
                batches: {
                    some: {
                        currentStock: { lte: 10 },
                    },
                },
            },
            include: { batches: { where: { tenantId } } },
        });

        const expiringSoon = await this.prisma.batch.findMany({
            where: {
                tenantId,
                expiryDate: {
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    gt: new Date(),
                },
            },
            include: { product: true },
        });

        return { lowStock, expiringSoon };
    }
}
