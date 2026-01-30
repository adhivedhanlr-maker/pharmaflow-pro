import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate a new TOTP secret for a user
     */
    async generateSecret(userId: string, username: string) {
        const secret = speakeasy.generateSecret({
            name: `PharmaFlow Pro (${username})`,
            length: 32,
        });

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

        return {
            secret: secret.base32,
            qrCode: qrCodeDataUrl,
        };
    }

    /**
     * Verify a TOTP code against a user's secret
     */
    verifyToken(secret: string, token: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2, // Allow 2 time steps before/after for clock drift
        });
    }

    /**
     * Enable 2FA for a user after verifying the initial code
     */
    async enable2FA(userId: string, secret: string, token: string): Promise<boolean> {
        // Verify the token first
        if (!this.verifyToken(secret, token)) {
            return false;
        }

        // Save the secret and enable 2FA
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
            },
        });

        return true;
    }

    /**
     * Disable 2FA for a user
     */
    async disable2FA(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });
    }

    /**
     * Check if user has 2FA enabled
     */
    async is2FAEnabled(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorEnabled: true },
        });
        return user?.twoFactorEnabled || false;
    }
}
