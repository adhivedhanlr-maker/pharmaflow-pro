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

    async updateLogo(userId: string, tenantId: string | undefined, logoUrl: string) {
        return this.prisma.businessProfile.upsert({
            where: { userId },
            update: { logoUrl, tenantId },
            create: { userId, tenantId, logoUrl, companyName: 'My Company' },
        });
    }
}
