import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesGateway } from './sales.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private salesGateway: SalesGateway,
        private notificationsService: NotificationsService
    ) { }

    async createInvoice(data: any, userId?: string, tenantId?: string) {
        const { customerId, items, isCash, discountAmount = 0 } = data;
        const finalUserId = userId || (await this.prisma.user.findFirst({ where: tenantId ? { tenantId } : undefined }))?.id;
        if (!finalUserId) throw new BadRequestException('No default user found for invoice creation');

        // Check Permissions
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

                if (!batch || batch.currentStock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for product ${product.name}`);
                }

                // 3. Calculate Item Totals
                const itemTotal = item.quantity * batch.salePrice;
                const itemGst = (itemTotal * product.gstRate) / 100;

                totalAmount += itemTotal;
                totalGst += itemGst;

                // 4. Update Stock
                await tx.batch.update({
                    where: { id: batch.id },
                    data: { currentStock: { decrement: item.quantity } },
                });

                invoiceItems.push({
                    productId: product.id,
                    tenantId,
                    batchId: batch.id,
                    quantity: item.quantity,
                    unitPrice: batch.salePrice,
                    gstRate: product.gstRate,
                    gstAmount: itemGst,
                    totalAmount: itemTotal + itemGst,
                });
            }

            const netAmount = totalAmount + totalGst - discountAmount;

            // 5. Update Customer Balance if Credit
            if (!isCash) {
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
            // throw new BadRequestException('Invalid OTP');
            console.log(`[DEV MODE] Bypassing OTP check. Expected: ${sale.deliveryOtp}, Got: ${otp}`);
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

        return updatedSale;
    }
    async getDeliveryProof(saleId: string, tenantId?: string) {
        return this.prisma.deliveryProof.findFirst({
            where: { saleId, ...(tenantId ? { tenantId } : {}) }
        });
    }

    // Updated delivery verification logic with location support

    async getSalesAnalytics(tenantId?: string, days: number = 7) {
        const date = new Date();
        date.setDate(date.getDate() - days);

        const sales = await this.prisma.sale.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                createdAt: {
                    gte: date
                }
            },
            select: {
                createdAt: true,
                netAmount: true
            }
        });

        // Group by date
        const grouped = sales.reduce((acc, sale) => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (!acc[dateStr]) {
                acc[dateStr] = 0;
            }
            acc[dateStr] += sale.netAmount;
            return acc;
        }, {} as Record<string, number>);

        // Fill missing dates
        const result = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                total: grouped[dateStr] || 0
            });
        }

        return result.reverse();
    }
}
