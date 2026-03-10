import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BrandingResponse = {
    slug: string;
    companyName: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    loginTitle: string;
    loginSubtitle: string;
    faviconUrl: string | null;
};

@Injectable()
export class TenantBrandingService {
    constructor(private readonly prisma: PrismaService) { }

    async resolveBranding(host?: string | null): Promise<BrandingResponse> {
        const normalizedHost = this.normalizeHost(host);
        const tenant = await this.findTenant(normalizedHost);

        return {
            slug: tenant?.slug ?? 'default',
            companyName: tenant?.companyName ?? 'PharmaFlow Pro',
            logoUrl: tenant?.logoUrl ?? null,
            primaryColor: tenant?.primaryColor ?? '#2563eb',
            accentColor: tenant?.accentColor ?? '#0f172a',
            loginTitle: tenant?.loginTitle ?? 'Welcome Back',
            loginSubtitle:
                tenant?.loginSubtitle ??
                'Sign in to manage your pharmaceutical distribution',
            faviconUrl: tenant?.faviconUrl ?? tenant?.logoUrl ?? null,
        };
    }

    private async findTenant(host?: string | null) {
        if (host) {
            const byDomain = await this.prisma.tenantBranding.findFirst({
                where: {
                    isActive: true,
                    customDomain: host,
                },
            });

            if (byDomain) {
                return byDomain;
            }

            const slug = this.extractSlug(host);
            if (slug) {
                const bySlug = await this.prisma.tenantBranding.findFirst({
                    where: {
                        isActive: true,
                        slug,
                    },
                });

                if (bySlug) {
                    return bySlug;
                }
            }
        }

        return this.prisma.tenantBranding.findFirst({
            where: {
                isActive: true,
                isDefault: true,
            },
        });
    }

    private normalizeHost(host?: string | null) {
        if (!host) {
            return null;
        }

        return host.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    }

    private extractSlug(host: string) {
        const segments = host.split('.').filter(Boolean);

        if (segments.length < 3) {
            return null;
        }

        return segments[0];
    }
}
