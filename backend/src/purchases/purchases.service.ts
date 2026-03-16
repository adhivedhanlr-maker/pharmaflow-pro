import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
    constructor(private prisma: PrismaService) { }

    async createPurchase(data: any, tenantId?: string) {
        const { supplierId, billNumber, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Supplier
            const supplier = await tx.supplier.findFirst({ where: { id: supplierId, ...(tenantId ? { tenantId } : {}) } });
            if (!supplier) throw new NotFoundException('Supplier not found');

            let totalAmount = 0;
            let totalGst = 0;

            const purchaseItems = [];

            for (const item of items) {
                // 2. Find or Create Product
                let product;
                if (item.productId) {
                    product = await tx.product.findFirst({ where: { id: item.productId, ...(tenantId ? { tenantId } : {}) } });
                    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                    // Update existing product composition and packing if provided
                    if (item.composition || item.packing) {
                        product = await tx.product.update({
                            where: { id: product.id },
                            data: {
                                composition: item.composition || product.composition,
                                packing: item.packing || product.packing,
                            }
                        });
                    }
                } else if (item.name) {
                    // Search by name
                    product = await tx.product.findFirst({ 
                        where: { 
                            name: { equals: item.name, mode: 'insensitive' },
                            ...(tenantId ? { tenantId } : {}) 
                        } 
                    });

                    // If still not found, create it
                    if (!product) {
                        product = await tx.product.create({
                            data: {
                                tenantId,
                                name: item.name,
                                composition: item.composition || "",
                                packing: item.packing || "",
                                gstRate: item.gstPercent || 12, // Default to 12% if unknown
                                company: "General",
                                mrp: item.salePrice || 0,
                            }
                        });
                    }
                } else {
                    throw new Error("Each item must have a productId or a name");
                }

                // Check if batch exists or create new
                let batch = await tx.batch.findFirst({
                    where: {
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        ...(tenantId ? { tenantId } : {}),
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
                            ptr: item.ptr,
                            pts: item.pts,
                            nr: item.nr,
                            expiryDate: new Date(item.expiryDate),
                        },
                    });
                } else {
                    // Create new batch
                    batch = await tx.batch.create({
                        data: {
                            tenantId,
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                            expiryDate: new Date(item.expiryDate),
                            currentStock: item.quantity,
                            purchasePrice: item.purchasePrice,
                            salePrice: item.salePrice,
                            ptr: item.ptr,
                            pts: item.pts,
                            nr: item.nr,
                        },
                    });
                }

                const itemTotal = item.quantity * item.purchasePrice;
                const itemGst = (itemTotal * product.gstRate) / 100;

                totalAmount += itemTotal;
                totalGst += itemGst;

                purchaseItems.push({
                    productId: product.id,
                    tenantId,
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
                    tenantId,
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

    async findAll(tenantId?: string) {
        return this.prisma.purchase.findMany({
            where: tenantId ? { tenantId } : undefined,
            include: { supplier: true, items: { include: { product: true, batch: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}
