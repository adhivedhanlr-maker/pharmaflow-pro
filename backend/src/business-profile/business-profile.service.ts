import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessProfileService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string, tenantId?: string) {
        const profile = await this.prisma.businessProfile.findUnique({
            where: { userId },
        });

        if (profile) return profile;

        return this.prisma.businessProfile.findFirst({
            where: tenantId ? { tenantId } : undefined,
        });
    }

    async updateProfile(userId: string, tenantId: string | undefined, data: any) {
        return this.prisma.businessProfile.upsert({
            where: { userId },
            update: { ...data, tenantId },
            create: { ...data, userId, tenantId },
        });
    }

    async updatePaymentQr(userId: string, tenantId: string | undefined, paymentQrUrl: string) {
        return this.prisma.businessProfile.upsert({
            where: { userId },
            update: { paymentQrUrl, tenantId },
            create: { userId, tenantId, paymentQrUrl, companyName: 'My Company' },
        });
    }

    async updateLogo(userId: string, tenantId: string | undefined, logoUrl: string) {
        // Save to BusinessProfile (used on invoices/settings preview)
        const result = await this.prisma.businessProfile.upsert({
            where: { userId },
            update: { logoUrl, tenantId },
            create: { userId, tenantId, logoUrl, companyName: 'My Company' },
        });

        // Also sync to TenantBranding so the header/branding API picks it up
        if (tenantId) {
            await this.prisma.tenantBranding.updateMany({
                where: { id: tenantId },
                data: { logoUrl },
            });
        }

        return result;
    }
}
