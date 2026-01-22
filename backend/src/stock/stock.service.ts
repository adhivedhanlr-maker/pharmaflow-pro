import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    async findAllBatches() {
        return this.prisma.batch.findMany({
            include: { product: true },
            orderBy: { expiryDate: 'asc' },
        });
    }

    async updateStockManual(batchId: string, quantity: number, reason: string) {
        const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch) throw new NotFoundException('Batch not found');

        // In a real system, we'd log this adjustment in a StockAdjustment table
        return this.prisma.batch.update({
            where: { id: batchId },
            data: {
                currentStock: quantity,
            },
            include: { product: true },
        });
    }

    async getStockAlerts() {
        const lowStock = await this.prisma.product.findMany({
            where: {
                batches: {
                    some: {
                        currentStock: { lte: 10 },
                    },
                },
            },
            include: { batches: true },
        });

        const expiringSoon = await this.prisma.batch.findMany({
            where: {
                expiryDate: {
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    gt: new Date(),
                },
            },
            include: { product: true },
        });

        return { lowStock, expiringSoon };
    }
}
