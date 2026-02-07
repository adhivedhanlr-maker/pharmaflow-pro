import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessProfileService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const profile = await this.prisma.businessProfile.findUnique({
            where: { userId },
        });

        if (profile) return profile;

        // Fallback: Return the first available business profile (global/admin profile)
        return this.prisma.businessProfile.findFirst();
    }

    async updateProfile(userId: string, data: any) {
        return this.prisma.businessProfile.upsert({
            where: { userId },
            update: { ...data },
            create: { ...data, userId },
        });
    }

    async updateLogo(userId: string, logoUrl: string) {
        return this.prisma.businessProfile.upsert({
            where: { userId },
            update: { logoUrl },
            create: { userId, logoUrl, companyName: 'My Company' }, // Default name if creating only for logo
        });
    }
}
