import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsService {
    private readonly logger = new Logger(AlertsService.name);

    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
        private notificationsService: NotificationsService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR) // Runs every hour for the demo
    async checkInventory() {
        this.logger.log('Running automated inventory check...');

        // Get all distinct tenants that have products
        const tenants = await this.prisma.product.findMany({
            select: { tenantId: true },
            distinct: ['tenantId'],
            where: { tenantId: { not: null } },
        });

        for (const { tenantId } of tenants) {
            if (!tenantId) continue;
            await this.checkInventoryForTenant(tenantId);
        }
    }

    private async checkInventoryForTenant(tenantId: string) {
        // 1. Check Low Stock
        const lowStockProducts = await this.prisma.product.findMany({
            where: {
                tenantId,
                batches: {
                    some: {
                        currentStock: { lte: 10 },
                    },
                },
            },
            include: { batches: { where: { tenantId } } },
        });

        for (const product of lowStockProducts) {
            const totalStock = product.batches.reduce((acc, b) => acc + b.currentStock, 0);
            if (totalStock <= product.reorderLevel) {
                await this.createNotification(
                    'LOW_STOCK',
                    `Product ${product.name} is running low (Total: ${totalStock}, Reorder: ${product.reorderLevel})`,
                    tenantId,
                );
            }
        }

        // 2. Check Expiry (next 30 days)
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);

        const expiringBatches = await this.prisma.batch.findMany({
            where: {
                tenantId,
                expiryDate: { lte: threshold, gt: new Date() },
            },
            include: { product: true },
        });

        for (const batch of expiringBatches) {
            await this.createNotification(
                'EXPIRY',
                `Batch ${batch.batchNumber} of ${batch.product.name} expires on ${batch.expiryDate.toDateString()}`,
                tenantId,
            );
        }
    }

    private async createNotification(type: string, message: string, tenantId?: string) {
        // Check if a similar unread notification already exists to avoid spam
        const existing = await this.prisma.notification.findFirst({
            where: {
                ...(tenantId ? { tenantId } : {}),
                type,
                message,
                isRead: false,
            },
        });

        if (!existing) {
            await this.prisma.notification.create({
                data: { type, message, tenantId },
            });

            this.logger.warn(`Alert Generated: ${message}`);
            await this.notificationsService.pushToTenantAdmins(tenantId, {
                title: 'PharmaFlow Pro Alert',
                body: message,
                url: '/',
            });

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

    async getNotifications(tenantId?: string) {
        return this.prisma.notification.findMany({
            where: tenantId ? { tenantId } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    async markAsRead(id: string, tenantId?: string) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        return this.prisma.notification.update({
            where: { id: notification.id },
            data: { isRead: true },
        });
    }
}
