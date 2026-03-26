import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

                    // Update existing product composition, packing and hsnCode if provided
                    if (item.composition || item.packing || item.hsnCode) {
                        product = await tx.product.update({
                            where: { id: product.id },
                            data: {
                                composition: item.composition || product.composition,
                                packing: item.packing || product.packing,
                                hsnCode: item.hsnCode || product.hsnCode,
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
                                hsnCode: item.hsnCode || "",
                                packing: item.packing || "",
                                gstRate: item.gstPercent || 12,
                                company: "General",
                                mrp: item.salePrice || 0,
                            }
                        });
                    }
                } else {
                    throw new Error("Each item must have a productId or a name");
                }

                // Check if batch exists for this product + batch number + supplier combination
                let batch = await tx.batch.findFirst({
                    where: {
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        supplierId: supplierId,
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
                            mrp: item.salePrice,
                            salePrice: item.salePrice,
                            ptr: item.ptr,
                            pts: item.pts,
                            nr: item.nr,
                            expiryDate: new Date(item.expiryDate),
                            supplierId: supplierId,
                        },
                    });
                } else {
                    // Create new batch — same batch number from different suppliers → separate records
                    batch = await tx.batch.create({
                        data: {
                            tenantId,
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                            supplierId: supplierId,
                            expiryDate: new Date(item.expiryDate),
                            currentStock: item.quantity,
                            purchasePrice: item.purchasePrice,
                            mrp: item.salePrice,
                            salePrice: item.salePrice,
                            ptr: item.ptr,
                            pts: item.pts,
                            nr: item.nr,
                        },
                    });
                }

                const freeQty = item.freeQty || 0;
                const discountPct = item.discountPct || 0;
                const itemGross = item.quantity * item.purchasePrice;
                const itemDiscount = (itemGross * discountPct) / 100;
                const itemTaxable = itemGross - itemDiscount;
                const itemGst = (itemTaxable * product.gstRate) / 100;

                totalAmount += itemTaxable;
                totalGst += itemGst;

                purchaseItems.push({
                    productId: product.id,
                    tenantId,
                    batchId: batch.id,
                    quantity: item.quantity,
                    freeQty,
                    discountPct,
                    purchasePrice: item.purchasePrice,
                    gstRate: product.gstRate,
                    gstAmount: itemGst,
                    totalAmount: itemTaxable + itemGst,
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

    async updatePurchase(id: string, data: any, tenantId?: string) {
        const old = await this.prisma.purchase.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { items: true },
        });
        if (!old) throw new NotFoundException('Purchase not found');

        const { supplierId, billNumber, items } = data;

        return this.prisma.$transaction(async (tx) => {
            // 1. Reverse old stock
            for (const item of old.items) {
                if (item.batchId) {
                    await tx.batch.update({
                        where: { id: item.batchId },
                        data: { currentStock: { decrement: item.quantity } },
                    });
                }
            }
            // 2. Reverse old supplier balance
            await tx.supplier.update({
                where: { id: old.supplierId },
                data: { currentBalance: { decrement: old.netAmount } },
            });
            // 3. Delete old items
            await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

            // 4. Process new items (same logic as create)
            const supplier = await tx.supplier.findFirst({ where: { id: supplierId, ...(tenantId ? { tenantId } : {}) } });
            if (!supplier) throw new NotFoundException('Supplier not found');

            let totalAmount = 0;
            let totalGst = 0;
            const purchaseItems: any[] = [];

            for (const item of items) {
                let product: any;
                if (item.productId) {
                    product = await tx.product.findFirst({ where: { id: item.productId, ...(tenantId ? { tenantId } : {}) } });
                    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
                    if (item.composition || item.packing || item.hsnCode) {
                        product = await tx.product.update({
                            where: { id: product.id },
                            data: { composition: item.composition || product.composition, hsnCode: item.hsnCode || product.hsnCode, packing: item.packing || product.packing },
                        });
                    }
                } else if (item.name) {
                    product = await tx.product.findFirst({ where: { name: { equals: item.name, mode: 'insensitive' }, ...(tenantId ? { tenantId } : {}) } });
                    if (!product) {
                        product = await tx.product.create({
                            data: { tenantId, name: item.name, composition: item.composition || '', hsnCode: item.hsnCode || '', packing: item.packing || '', gstRate: item.gstPercent || 12, company: 'General', mrp: item.salePrice || 0 },
                        });
                    }
                } else {
                    throw new Error('Each item must have a productId or a name');
                }

                let batch = await tx.batch.findFirst({ where: { productId: product.id, batchNumber: item.batchNumber, ...(tenantId ? { tenantId } : {}) } });
                if (batch) {
                    batch = await tx.batch.update({ where: { id: batch.id }, data: { currentStock: { increment: item.quantity }, purchasePrice: item.purchasePrice, mrp: item.salePrice, salePrice: item.salePrice, ptr: item.ptr, pts: item.pts, nr: item.nr, expiryDate: new Date(item.expiryDate) } });
                } else {
                    batch = await tx.batch.create({ data: { tenantId, productId: product.id, batchNumber: item.batchNumber, expiryDate: new Date(item.expiryDate), currentStock: item.quantity, purchasePrice: item.purchasePrice, mrp: item.salePrice, salePrice: item.salePrice, ptr: item.ptr, pts: item.pts, nr: item.nr } });
                }

                const freeQty = item.freeQty || 0;
                const discountPct = item.discountPct || 0;
                const itemGross = item.quantity * item.purchasePrice;
                const itemDiscount = (itemGross * discountPct) / 100;
                const itemTaxable = itemGross - itemDiscount;
                const itemGst = (itemTaxable * product.gstRate) / 100;
                totalAmount += itemTaxable;
                totalGst += itemGst;
                purchaseItems.push({ productId: product.id, tenantId, batchId: batch.id, quantity: item.quantity, freeQty, discountPct, purchasePrice: item.purchasePrice, gstRate: product.gstRate, gstAmount: itemGst, totalAmount: itemTaxable + itemGst });
            }

            const netAmount = totalAmount + totalGst;

            // 5. Update new supplier balance
            await tx.supplier.update({ where: { id: supplierId }, data: { currentBalance: { increment: netAmount } } });

            // 6. Update purchase record
            return tx.purchase.update({
                where: { id },
                data: { billNumber, supplierId, totalAmount, gstAmount: totalGst, netAmount, items: { create: purchaseItems } },
                include: { items: true, supplier: true },
            });
        });
    }

    async deletePurchase(id: string, tenantId?: string) {
        const purchase = await this.prisma.purchase.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { items: true },
        });
        if (!purchase) throw new NotFoundException('Purchase not found');

        return this.prisma.$transaction(async (tx) => {
            // 1. Reverse stock for each item
            for (const item of purchase.items) {
                if (item.batchId) {
                    await tx.batch.update({
                        where: { id: item.batchId },
                        data: { currentStock: { decrement: item.quantity } },
                    });
                }
            }

            // 2. Reverse supplier balance
            await tx.supplier.update({
                where: { id: purchase.supplierId },
                data: { currentBalance: { decrement: purchase.netAmount } },
            });

            // 3. Delete purchase items then purchase
            await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
            return tx.purchase.delete({ where: { id: purchase.id } });
        });
    }
}
