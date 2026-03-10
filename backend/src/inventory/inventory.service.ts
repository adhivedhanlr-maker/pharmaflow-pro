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
    }, tenantId?: string) {
        const {
            skip = 0,
            take = 100,
            search,
            includeBatches = true,
            onlyWithStock = false,
        } = params || {};

        const where = {
            ...(tenantId ? { tenantId } : {}),
            ...(search
                ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { hsnCode: { contains: search, mode: 'insensitive' as const } },
                    { company: { contains: search, mode: 'insensitive' as const } },
                ],
            }
                : {}),
        };

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

    async findProductById(id: string, tenantId?: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { batches: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    async createProduct(data: any, tenantId?: string) {
        return this.prisma.product.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }

    async updateProduct(id: string, data: any, tenantId?: string) {
        const product = await this.prisma.product.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
        if (!product) throw new NotFoundException('Product not found');

        return this.prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                company: data.company,
                hsnCode: data.hsnCode,
                mrp: data.mrp,
            },
        });
    }

    // Batch Methods
    async createBatch(data: any, tenantId?: string) {
        return this.prisma.batch.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }

    async getExpiringSoon(tenantId?: string, days: number = 30) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return this.prisma.batch.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                expiryDate: {
                    lte: date,
                    gte: new Date(),
                },
            },
            include: { product: true },
        });
    }

    async getLowStock(tenantId?: string) {
        return this.prisma.product.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
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

    async findByBarcode(code: string, tenantId?: string) {
        // Try to find product by barcode
        const product = await this.prisma.product.findFirst({
            where: { barcode: code, ...(tenantId ? { tenantId } : {}) },
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
        const batch = await this.prisma.batch.findFirst({
            where: { batchBarcode: code, ...(tenantId ? { tenantId } : {}) },
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
    async deleteProduct(id: string, tenantId?: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
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
                await tx.purchaseItem.deleteMany({ where: { productId: id, ...(tenantId ? { tenantId } : {}) } });
            }
            // Delete batches
            await tx.batch.deleteMany({ where: { productId: id, ...(tenantId ? { tenantId } : {}) } });
            // Finally delete product
            return tx.product.delete({ where: { id } });
        });
    }

    async deleteBatch(id: string, tenantId?: string) {
        const batch = await this.prisma.batch.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
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
                await tx.purchaseItem.deleteMany({ where: { batchId: id, ...(tenantId ? { tenantId } : {}) } });
            }
            return tx.batch.delete({ where: { id } });
        });
    }
}
