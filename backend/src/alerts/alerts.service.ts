import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AlertsService {
    private readonly logger = new Logger(AlertsService.name);

    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR) // Runs every hour for the demo
    async checkInventory() {
        this.logger.log('Running automated inventory check...');

        // 1. Check Low Stock
        const lowStockProducts = await this.prisma.product.findMany({
            where: {
                batches: {
                    some: {
                        currentStock: { lte: 10 }, // Can be dynamic based on reorderLevel
                    },
                },
            },
            include: { batches: true },
        });

        for (const product of lowStockProducts) {
            const totalStock = product.batches.reduce((acc, b) => acc + b.currentStock, 0);
            if (totalStock <= product.reorderLevel) {
                await this.createNotification(
                    'LOW_STOCK',
                    `Product ${product.name} is running low (Total: ${totalStock}, Reorder: ${product.reorderLevel})`
                );
            }
        }

        // 2. Check Expiry (next 30 days)
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);

        const expiringBatches = await this.prisma.batch.findMany({
            where: {
                expiryDate: { lte: threshold, gt: new Date() },
            },
            include: { product: true },
        });

        for (const batch of expiringBatches) {
            await this.createNotification(
                'EXPIRY',
                `Batch ${batch.batchNumber} of ${batch.product.name} expires on ${batch.expiryDate.toDateString()}`
            );
        }
    }

    private async createNotification(type: string, message: string) {
        // Check if a similar unread notification already exists to avoid spam
        const existing = await this.prisma.notification.findFirst({
            where: {
                type,
                message,
                isRead: false,
            },
        });

        if (!existing) {
            await this.prisma.notification.create({
                data: { type, message },
            });

            this.logger.warn(`Alert Generated: ${message}`);

            // Attempt to send email in production environment
            if (process.env.NODE_ENV === 'production') {
                try {
                    await this.mailerService.sendMail({
                        to: process.env.ADMIN_EMAIL || 'admin@pharmaflow.pro',
                        subject: `PharmaFlow Alert: ${type}`,
                        text: message,
                    });
                    this.logger.log(`Email alert sent for ${type}`);
                } catch (error) {
                    this.logger.error(`Failed to send email alert: ${error.message}`);
                }
            }
        }
    }

    async getNotifications() {
        return this.prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    async markAsRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }
}
