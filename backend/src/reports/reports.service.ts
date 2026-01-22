import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getGstReport(startDate: Date, endDate: Date) {
        const sales = await this.prisma.sale.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
            },
        });

        // Aggregate by tax rate
        const taxSummary: { [key: number]: { taxableAmount: number; gstAmount: number } } = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const rate = item.gstRate;
                if (!taxSummary[rate]) {
                    taxSummary[rate] = { taxableAmount: 0, gstAmount: 0 };
                }
                taxSummary[rate].taxableAmount += item.totalAmount - item.gstAmount;
                taxSummary[rate].gstAmount += item.gstAmount;
            });
        });

        return {
            totalSales: sales.reduce((acc, s) => acc + s.netAmount, 0),
            taxSummary,
        };
    }

    async getExpiryForecast() {
        const now = new Date();
        const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 1);
        const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, 1);

        const expiring3 = await this.prisma.batch.findMany({
            where: { expiryDate: { lte: threeMonths, gt: now } },
            include: { product: true },
        });

        const expiring6 = await this.prisma.batch.findMany({
            where: { expiryDate: { lte: sixMonths, gt: threeMonths } },
            include: { product: true },
        });

        return {
            next3Months: expiring3,
            next6Months: expiring6,
            potentialLoss: expiring3.reduce((acc, b) => acc + (b.currentStock * b.purchasePrice), 0),
        };
    }

    async getProfitabilitySummary() {
        const saleItems = await this.prisma.saleItem.findMany({
            include: { batch: true },
        });

        let totalProfit = 0;
        let totalRevenue = 0;

        saleItems.forEach(item => {
            const revenue = item.quantity * item.unitPrice;
            const cost = item.quantity * item.batch.purchasePrice;
            totalRevenue += revenue;
            totalProfit += (revenue - cost);
        });

        return {
            revenue: totalRevenue,
            profit: totalProfit,
            margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        };
    }
}
