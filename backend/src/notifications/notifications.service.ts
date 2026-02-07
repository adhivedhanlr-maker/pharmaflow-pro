import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(NotificationsService.name);

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail', // Or use 'smtp.gmail.com'
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
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
            this.logger.error('Failed to send email', error);
            // Don't throw to avoid breaking the main flow
        }
    }

    async notifyAdminOfDutyStart(userName: string, time: Date) {
        const subject = `[Duty Alert] ${userName} started duty`;
        const text = `${userName} has started their duty at ${time.toLocaleString()}.`;
        // In a real app, 'to' would be fetched from Admin users in DB
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await this.sendEmail(adminEmail, subject, text);
    }

    async notifyAdminOfHighValueOrder(orderNumber: string, amount: number, repName: string) {
        const subject = `[High Value Order] ₹${amount} from ${repName}`;
        const text = `A new high value order #${orderNumber} of ₹${amount} has been placed by ${repName}.`;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await this.sendEmail(adminEmail, subject, text);
    }
}
