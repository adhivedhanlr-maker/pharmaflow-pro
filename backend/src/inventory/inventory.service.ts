import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

    // Product Methods
    async findAllProducts() {
        return this.prisma.product.findMany({
            include: { batches: true },
        });
    }

    async findProductById(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { batches: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    async createProduct(data: any) {
        return this.prisma.product.create({
            data,
        });
    }

    // Batch Methods
    async createBatch(data: any) {
        return this.prisma.batch.create({
            data,
        });
    }

    async getExpiringSoon(days: number = 30) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return this.prisma.batch.findMany({
            where: {
                expiryDate: {
                    lte: date,
                    gte: new Date(),
                },
            },
            include: { product: true },
        });
    }

    async getLowStock() {
        return this.prisma.product.findMany({
            where: {
                batches: {
                    some: {
                        currentStock: {
                            lte: 10, // Should be dynamic based on reorderLevel
                        },
                    },
                },
            },
            include: { batches: true },
        });
    }
}
