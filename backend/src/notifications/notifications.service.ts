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

    async sendSms(to: string, message: string) {
        // MOCK SMS IMPLEMENTATION
        // In production, integrate with Twilio, MSG91, etc.
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
