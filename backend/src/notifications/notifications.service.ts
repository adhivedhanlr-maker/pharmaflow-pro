import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

type WebPushSubscription = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};

type StoredPushSubscription = {
    endpoint: string;
    p256dh: string;
    auth: string;
    userId: string;
};

@Injectable()
export class NotificationsService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private prisma: PrismaService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
            webpush.setVapidDetails(
                process.env.VAPID_SUBJECT,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY,
            );
        }
    }

    async savePushSubscription(userId: string, tenantId: string | undefined, subscription: WebPushSubscription) {
        return (this.prisma as any).pushSubscription.upsert({
            where: {
                userId_endpoint: {
                    userId,
                    endpoint: subscription.endpoint,
                },
            },
            update: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                tenantId,
            },
            create: {
                userId,
                tenantId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        });
    }

    async removePushSubscription(userId: string, endpoint: string) {
        await (this.prisma as any).pushSubscription.deleteMany({
            where: {
                userId,
                endpoint,
            },
        });
    }

    async pushToTenantAdmins(tenantId: string | undefined, payload: { title: string; body: string; url?: string }) {
        if (!tenantId || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
            return;
        }

        const subscriptions: StoredPushSubscription[] = await (this.prisma as any).pushSubscription.findMany({
            where: {
                tenantId,
                user: {
                    role: 'ADMIN',
                },
            },
        });

        await Promise.all(subscriptions.map((subscription: StoredPushSubscription) => this.sendPush(subscription, payload)));
    }

    private async sendPush(
        subscription: { endpoint: string; p256dh: string; auth: string; userId: string },
        payload: { title: string; body: string; url?: string }
    ) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                },
                JSON.stringify(payload),
            );
        } catch (error: any) {
            this.logger.error(`Failed to send web push: ${error?.message || error}`);
            if (error?.statusCode === 404 || error?.statusCode === 410) {
                try {
                    await (this.prisma as any).pushSubscription.deleteMany({
                        where: { endpoint: subscription.endpoint, userId: subscription.userId },
                    });
                } catch (deleteErr: any) {
                    this.logger.error(`Failed to delete stale push subscription: ${deleteErr?.message || deleteErr}`);
                }
            }
        }
    }

    async sendEmail(to: string, subject: string, text: string, html?: string) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                text,
                html,
            });
            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error('Failed to send email', error as any);
        }
    }

    async sendSms(to: string, message: string) {
        this.logger.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
        console.log(`\n\n=== SMS OUTGOING ===\nTo: ${to}\nMessage: ${message}\n====================\n`);
        return true;
    }

    async sendDeliveryOtp(customerName: string, phone: string, otp: string) {
        if (!phone) {
            this.logger.warn(`Cannot send OTP: Customer ${customerName} has no phone number.`);
            return;
        }

        const message = `Dear ${customerName}, your delivery verification OTP is ${otp}. Please share this with the delivery agent only after receiving your items.`;
        return this.sendSms(phone, message);
    }

    async notifyAdminOfDutyStart(userName: string, time: Date) {
        const subject = `[Duty Alert] ${userName} started duty`;
        const text = `${userName} has started their duty at ${time.toLocaleString()}.`;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await this.sendEmail(adminEmail, subject, text);
    }

    async notifyAdminOfHighValueOrder(orderNumber: string, amount: number, repName: string) {
        const subject = `[High Value Order] Rs ${amount} from ${repName}`;
        const text = `A new high value order #${orderNumber} of Rs ${amount} has been placed by ${repName}.`;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await this.sendEmail(adminEmail, subject, text);
    }
}
