import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

    // Product Methods
    async findAllProducts(params?: {
        skip?: number;
        take?: number;
        search?: string;
        includeBatches?: boolean;
        onlyWithStock?: boolean;
    }) {
        const {
            skip = 0,
            take = 100,
            search,
            includeBatches = true,
            onlyWithStock = false,
        } = params || {};

        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { hsnCode: { contains: search, mode: 'insensitive' as const } },
                    { company: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take,
                ...(includeBatches && {
                    include: {
                        batches: onlyWithStock
                            ? {
                                where: { currentStock: { gt: 0 } },
                                orderBy: { expiryDate: 'asc' as const },
                            }
                            : { orderBy: { expiryDate: 'asc' as const } },
                    },
                }),
                orderBy: { name: 'asc' },
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            data: products,
            total,
            hasMore: skip + products.length < total,
        };
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

    async findByBarcode(code: string) {
        // Try to find product by barcode
        const product = await this.prisma.product.findUnique({
            where: { barcode: code },
            include: {
                batches: {
                    where: { currentStock: { gt: 0 } },
                    orderBy: { expiryDate: 'asc' },
                },
            },
        });

        if (product) {
            return product;
        }

        // Try to find batch by batch barcode
        const batch = await this.prisma.batch.findUnique({
            where: { batchBarcode: code },
            include: {
                product: {
                    include: {
                        batches: {
                            where: { currentStock: { gt: 0 } },
                            orderBy: { expiryDate: 'asc' },
                        },
                    },
                },
            },
        });

        if (batch) {
            return { ...batch.product, selectedBatch: batch };
        }

        throw new NotFoundException(`No product or batch found with barcode: ${code}`);
    }
    async deleteProduct(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                saleItems: { take: 1 },
                purchaseItems: true,
                orderItems: { take: 1 },
                batches: true
            }
        });

        if (!product) throw new NotFoundException('Product not found');

        // Block if sold (or in order)
        if (product.saleItems.length > 0 || product.orderItems.length > 0) {
            throw new BadRequestException('Cannot delete product with existing sales or orders. Consider deactivating it.');
        }

        // If it has purchase items but no sales, we can delete it but must handle relations
        return this.prisma.$transaction(async (tx) => {
            // Delete purchase items first
            if (product.purchaseItems.length > 0) {
                await tx.purchaseItem.deleteMany({ where: { productId: id } });
            }
            // Delete batches
            await tx.batch.deleteMany({ where: { productId: id } });
            // Finally delete product
            return tx.product.delete({ where: { id } });
        });
    }

    async deleteBatch(id: string) {
        const batch = await this.prisma.batch.findUnique({
            where: { id },
            include: {
                saleItems: { take: 1 },
                purchaseItems: true
            }
        });

        if (!batch) throw new NotFoundException('Batch not found');

        if (batch.saleItems.length > 0) {
            throw new BadRequestException('Cannot delete batch that has existing sales.');
        }

        return this.prisma.$transaction(async (tx) => {
            // Delete purchase items for this batch
            if (batch.purchaseItems.length > 0) {
                await tx.purchaseItem.deleteMany({ where: { batchId: id } });
            }
            return tx.batch.delete({ where: { id } });
        });
    }
}
