import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesGateway } from './sales.gateway';
import { NotificationsService } from '../notifications/notifications.service';

type AnalyticsRange = 'day' | 'week' | 'month' | 'year' | 'custom';
type AnalyticsBucket = 'hour' | 'day' | 'month';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private salesGateway: SalesGateway,
        private notificationsService: NotificationsService
    ) { }

    async createInvoice(data: any, userId?: string, tenantId?: string) {
        const { customerId, items, discountAmount = 0, customerType } = data;
        const finalPaymentMethod = data.paymentMethod || (data.isCash === false ? 'CREDIT' : 'CASH');
        const isCash = finalPaymentMethod !== 'CREDIT';

        const finalUserId = userId || (await this.prisma.user.findFirst({ where: tenantId ? { tenantId } : undefined }))?.id;
        if (!finalUserId) throw new BadRequestException('No default user found for invoice creation');

        const user = await this.prisma.user.findFirst({ where: { id: finalUserId, ...(tenantId ? { tenantId } : {}) } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === 'SALES_REP' && !user.canGenerateInvoice) {
            throw new BadRequestException('You are not authorized to generate invoices. Please contact admin.');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Verify Customer
            const customer = await tx.customer.findFirst({ where: { id: customerId, ...(tenantId ? { tenantId } : {}) } });
            if (!customer) throw new NotFoundException('Customer not found');

            let totalAmount = 0;
            let totalGst = 0;

            const invoiceItems = [];

            for (const item of items) {
                const product = await tx.product.findFirst({ where: { id: item.productId, ...(tenantId ? { tenantId } : {}) } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                // 2. Batch Selection (FEFO if not specified)
                let batch;
                if (item.batchId) {
                    batch = await tx.batch.findFirst({ where: { id: item.batchId, ...(tenantId ? { tenantId } : {}) } });
                } else {
                    // Auto-select batch with earliest expiry that has stock
                    batch = await tx.batch.findFirst({
                        where: {
                            productId: item.productId,
                            ...(tenantId ? { tenantId } : {}),
                            currentStock: { gte: item.quantity },
                            expiryDate: { gt: new Date() },
                        },
                        orderBy: { expiryDate: 'asc' },
                    });
                }

                // 3. Calculate Item Totals
                const freeQty = item.freeQuantity || 0;
                const billedQty = item.quantity;
                const stockQty = billedQty + freeQty;

                if (!batch || batch.currentStock < stockQty) {
                    throw new BadRequestException(`Insufficient stock for product ${product.name}`);
                }
                // Use frontend unitPrice (PTR for pharmacy, PTS for distributor); fallback to salePrice
                const unitPrice = item.unitPrice ?? batch.salePrice;
                const itemTotal = billedQty * unitPrice;
                const itemGst = (itemTotal * product.gstRate) / 100;

                totalAmount += itemTotal;
                totalGst += itemGst;

                // 4. Update Stock (billed + free)
                await tx.batch.update({
                    where: { id: batch.id },
                    data: { currentStock: { decrement: stockQty } },
                });

                invoiceItems.push({
                    productId: product.id,
                    tenantId,
                    batchId: batch.id,
                    quantity: billedQty,
                    freeQuantity: freeQty,
                    unitPrice,
                    gstRate: product.gstRate,
                    gstAmount: itemGst,
                    totalAmount: itemTotal + itemGst,
                });
            }

            const netAmount = Math.max(0, totalAmount + totalGst - discountAmount);

            // 5. Update Customer Balance if Credit
            if (finalPaymentMethod === 'CREDIT') {
                await tx.customer.update({
                    where: { id: customerId },
                    data: { currentBalance: { increment: netAmount } },
                });
            }

            // 6. Create Invoice
            const invoiceNumber = `INV-${Date.now()}`; // Simple generator for now

            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            const sale = await tx.sale.create({
                data: {
                    tenantId,
                    invoiceNumber,
                    customerId,
                    userId: finalUserId,
                    repId: data.repId || finalUserId, // Auto-assign rep if provided, else creator
                    totalAmount,
                    gstAmount: totalGst,
                    netAmount,
                    discountAmount,
                    isCash,
                    paymentMethod: finalPaymentMethod,
                    customerType: customerType || 'PHARMACY',
                    deliveryOtp: otp,
                    items: {
                        create: invoiceItems,
                    },
                },
                include: {
                    items: true,
                    customer: true,
                    rep: true // Include rep details
                },
            });

            return sale;
        });

        // 7. Post-Transaction: Notifications
        // Notify real-time clients
        this.salesGateway.notifyNewOrder(result);

        // Send OTP via SMS
        if (result.deliveryOtp && result.customer.phone) {
            // We don't await this to avoid blocking the response
            this.notificationsService.sendDeliveryOtp(result.customer.name, result.customer.phone, result.deliveryOtp)
                .catch(err => console.error('Failed to send OTP SMS:', err));
        }

        await this.notificationsService.pushToTenantAdmins(tenantId, {
            title: 'New Sale',
            body: `Invoice ${result.invoiceNumber} created for ${result.customer.name}`,
            url: '/sales',
        });

        return result;
    }

    async assignRep(id: string, repId: string, tenantId?: string) {
        const sale = await this.prisma.sale.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
        if (!sale) throw new NotFoundException('Invoice not found');

        return this.prisma.sale.update({
            where: { id },
            data: { repId },
            include: { rep: { select: { name: true } } }
        });
    }

    async findAll(user?: any) {
        const where: any = {};
        if (user?.tenantId) {
            where.tenantId = user.tenantId;
        }
        if (user && user.role === 'SALES_REP') {
            where.repId = user.userId;
        }

        return this.prisma.sale.findMany({
            where,
            include: {
                customer: true,
                items: { include: { product: true, batch: true } },
                user: { select: { name: true, role: true } },
                rep: { select: { name: true } },
                deliveryProof: {
                    select: { id: true, latitude: true, longitude: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getReceivables(tenantId?: string) {
        return this.prisma.sale.findMany({
            where: {
                paymentMethod: 'CREDIT',
                ...(tenantId ? { tenantId } : {})
            },
            include: {
                customer: true,
                items: { include: { product: true, batch: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async verifyDelivery(
        invoiceId: string,
        otp: string,
        proofUrl?: string,
        signatureUrl?: string,
        deliveryLatitude?: number,
        deliveryLongitude?: number,
        deliveryInfo?: string,
        tenantId?: string
    ) {
        const sale = await this.prisma.sale.findFirst({ where: { id: invoiceId, ...(tenantId ? { tenantId } : {}) } });
        if (!sale) throw new NotFoundException('Invoice not found');

        if (sale.deliveryStatus === 'DELIVERED') {
            throw new BadRequestException('Invoice already delivered');
        }

        if (sale.deliveryOtp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }

        const updatedSale = await this.prisma.sale.update({
            where: { id: invoiceId },
            data: {
                deliveryStatus: 'DELIVERED',
                deliveredAt: new Date(),
                deliveryProof: {
                    create: {
                        tenantId,
                        proofUrl,
                        signatureUrl,
                        latitude: deliveryLatitude,
                        longitude: deliveryLongitude,
                        info: deliveryInfo
                    }
                }
            },
            include: { deliveryProof: true }
        });

        await this.notificationsService.pushToTenantAdmins(tenantId, {
            title: 'Delivery Verified',
            body: `Invoice ${sale.invoiceNumber} marked delivered`,
            url: '/deliveries',
        });

        return updatedSale;
    }
    async getDeliveryProof(saleId: string, tenantId?: string) {
        return this.prisma.deliveryProof.findFirst({
            where: { saleId, ...(tenantId ? { tenantId } : {}) }
        });
    }

    // Updated delivery verification logic with location support

    async getSalesAnalytics(
        tenantId?: string,
        options?: { range?: string; startDate?: string; endDate?: string }
    ) {
        const range = this.normalizeAnalyticsRange(options?.range);
        const { start, end, bucket } = this.resolveAnalyticsWindow(range, options?.startDate, options?.endDate);

        const sales = await this.prisma.sale.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                createdAt: {
                    gte: start,
                    lte: end,
                }
            },
            select: {
                createdAt: true,
                netAmount: true
            }
        });

        const grouped = new Map<string, number>();

        for (const sale of sales) {
            const key = this.getAnalyticsBucketKey(sale.createdAt, bucket);
            grouped.set(key, (grouped.get(key) || 0) + sale.netAmount);
        }

        const points = this.buildAnalyticsBuckets(start, end, bucket).map((point) => ({
            ...point,
            total: grouped.get(point.key) || 0,
        }));

        return {
            range,
            bucket,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            points,
        };
    }

    private normalizeAnalyticsRange(range?: string): AnalyticsRange {
        if (range === 'day' || range === 'week' || range === 'month' || range === 'year' || range === 'custom') {
            return range;
        }

        return 'week';
    }

    private resolveAnalyticsWindow(range: AnalyticsRange, startDate?: string, endDate?: string) {
        const now = new Date();

        if (range === 'custom') {
            if (!startDate || !endDate) {
                throw new BadRequestException('startDate and endDate are required for custom analytics');
            }

            const start = new Date(`${startDate}T00:00:00.000Z`);
            const end = new Date(`${endDate}T23:59:59.999Z`);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                throw new BadRequestException('Invalid analytics date range');
            }

            if (start > end) {
                throw new BadRequestException('startDate must be before endDate');
            }

            const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
            const bucket: AnalyticsBucket = diffDays <= 1 ? 'hour' : diffDays > 92 ? 'month' : 'day';

            return { start, end, bucket };
        }

        if (range === 'day') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            return { start, end, bucket: 'hour' as const };
        }

        if (range === 'week') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - 6);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            return { start, end, bucket: 'day' as const };
        }

        if (range === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return { start, end, bucket: 'day' as const };
        }

        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end, bucket: 'month' as const };
    }

    private buildAnalyticsBuckets(start: Date, end: Date, bucket: AnalyticsBucket) {
        const points: Array<{ key: string; label: string; date: string }> = [];

        if (bucket === 'hour') {
            const cursor = new Date(start);
            while (cursor <= end) {
                const key = this.getAnalyticsBucketKey(cursor, bucket);
                points.push({
                    key,
                    label: cursor.toLocaleTimeString('en-US', { hour: 'numeric' }),
                    date: cursor.toISOString(),
                });
                cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
            }
            return points;
        }

        if (bucket === 'day') {
            const cursor = new Date(start);
            while (cursor <= end) {
                const key = this.getAnalyticsBucketKey(cursor, bucket);
                points.push({
                    key,
                    label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    date: cursor.toISOString(),
                });
                cursor.setDate(cursor.getDate() + 1);
                cursor.setHours(0, 0, 0, 0);
            }
            return points;
        }

        const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 0, 0, 0, 0);
        while (cursor <= end) {
            const key = this.getAnalyticsBucketKey(cursor, bucket);
            points.push({
                key,
                label: cursor.toLocaleDateString('en-US', { month: 'short' }),
                date: cursor.toISOString(),
            });
            cursor.setMonth(cursor.getMonth() + 1, 1);
            cursor.setHours(0, 0, 0, 0);
        }

        return points;
    }

    private getAnalyticsBucketKey(date: Date, bucket: AnalyticsBucket) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hour = String(date.getUTCHours()).padStart(2, '0');

        if (bucket === 'month') {
            return `${year}-${month}`;
        }

        if (bucket === 'day') {
            return `${year}-${month}-${day}`;
        }

        return `${year}-${month}-${day}-${hour}`;
    }

    async deleteSale(id: string, tenantId?: string) {
        const sale = await this.prisma.sale.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: {
                items: true,
                returns: { include: { items: true } },
                deliveryProof: true,
            },
        });
        if (!sale) throw new NotFoundException('Invoice not found');

        return this.prisma.$transaction(async (tx) => {
            // 1. Delete sale return items then sale returns
            for (const ret of sale.returns) {
                await tx.saleReturnItem.deleteMany({ where: { saleReturnId: ret.id } });
                // Also restore stock for returned items (they were added back, so remove again)
            }
            await tx.saleReturn.deleteMany({ where: { saleId: sale.id } });

            // 2. Delete delivery proof
            if (sale.deliveryProof) {
                await tx.deliveryProof.delete({ where: { saleId: sale.id } });
            }

            // 3. Restore stock for each sold item (billed qty + free qty)
            for (const item of sale.items) {
                if (item.batchId) {
                    await tx.batch.update({
                        where: { id: item.batchId },
                        data: { currentStock: { increment: item.quantity + (item.freeQuantity || 0) } },
                    });
                }
            }

            // 4. Reverse customer credit balance (only if it was a credit sale)
            if (!sale.isCash) {
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { currentBalance: { decrement: sale.netAmount } },
                });
            }

            // 5. Delete sale items then sale
            await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
            return tx.sale.delete({ where: { id: sale.id } });
        });
    }
}
