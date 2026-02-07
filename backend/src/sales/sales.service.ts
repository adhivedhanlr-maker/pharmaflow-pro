import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesGateway } from './sales.gateway';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private salesGateway: SalesGateway
    ) { }

    async createInvoice(data: any, userId?: string) {
        const { customerId, items, isCash, discountAmount = 0 } = data;
        const finalUserId = userId || (await this.prisma.user.findFirst())?.id;
        if (!finalUserId) throw new BadRequestException('No default user found for invoice creation');

        // Check Permissions
        const user = await this.prisma.user.findUnique({ where: { id: finalUserId } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === 'SALES_REP' && !user.canGenerateInvoice) {
            throw new BadRequestException('You are not authorized to generate invoices. Please contact admin.');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Verify Customer
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer) throw new NotFoundException('Customer not found');

            let totalAmount = 0;
            let totalGst = 0;

            const invoiceItems = [];

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                // 2. Batch Selection (FEFO if not specified)
                let batch;
                if (item.batchId) {
                    batch = await tx.batch.findUnique({ where: { id: item.batchId } });
                } else {
                    // Auto-select batch with earliest expiry that has stock
                    batch = await tx.batch.findFirst({
                        where: {
                            productId: item.productId,
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

            const result = await tx.sale.create({
                data: {
                    invoiceNumber,
                    customerId,
                    userId: finalUserId,
                    repId: data.repId || finalUserId, // Auto-assign rep if provided, else creator
                    totalAmount,
                    gstAmount: totalGst,
                    netAmount,
                    discountAmount,
                    isCash,
                    deliveryOtp: Math.floor(100000 + Math.random() * 900000).toString(),
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

            // Notify real-time clients
            this.salesGateway.notifyNewOrder(result);

            return result;
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
                rep: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async verifyDelivery(invoiceId: string, otp: string, proofUrl?: string, signatureUrl?: string) {
        const sale = await this.prisma.sale.findUnique({ where: { id: invoiceId } });
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
                deliveryProofUrl: proofUrl,
                deliverySignatureUrl: signatureUrl,
            },
        });

        return updatedSale;
    }
}

