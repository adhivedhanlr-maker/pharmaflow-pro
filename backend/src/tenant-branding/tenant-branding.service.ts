import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BrandingResponse = {
    id?: string;
    slug: string;
    companyName: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    loginTitle: string;
    loginSubtitle: string;
    faviconUrl: string | null;
    requiresSetup: boolean;
};

@Injectable()
export class TenantBrandingService {
    constructor(private readonly prisma: PrismaService) { }

    async resolveBranding(host?: string | null): Promise<BrandingResponse> {
        const normalizedHost = this.normalizeHost(host);
        const tenant = await this.findTenant(normalizedHost);

        return {
            id: tenant?.id,
            slug: tenant?.slug ?? 'default',
            companyName: tenant?.companyName ?? 'PharmaFlow Pro',
            logoUrl: tenant?.logoUrl ?? null,
            primaryColor: tenant?.primaryColor ?? '#2563eb',
            accentColor: tenant?.accentColor ?? '#0f172a',
            loginTitle: tenant?.loginTitle ?? 'Welcome Back',
            loginSubtitle:
                tenant?.loginSubtitle ??
                'Sign in to manage your pharmaceutical distribution',
            faviconUrl: tenant?.logoUrl ?? tenant?.faviconUrl ?? null,
            requiresSetup: tenant ? (await this.prisma.user.count({
                where: { tenantId: tenant.id },
            })) === 0 : false,
        };
    }

    async resolveTenant(host?: string | null) {
        const normalizedHost = this.normalizeHost(host);
        return this.findTenant(normalizedHost);
    }

    async getTenantById(id: string) {
        return this.prisma.tenantBranding.findUnique({
            where: { id },
        });
    }

    async listTenants() {
        const tenants = await this.prisma.tenantBranding.findMany({
            orderBy: { createdAt: 'desc' },
        });

        const tenantIds = tenants.map((tenant) => tenant.id);
        const counts = tenantIds.length === 0
            ? []
            : await this.prisma.user.groupBy({
                by: ['tenantId'],
                where: {
                    tenantId: { in: tenantIds },
                },
                _count: {
                    _all: true,
                },
            });

        const countMap = new Map(
            counts.map((entry) => [entry.tenantId, entry._count._all]),
        );

        return tenants.map((tenant) => ({
            ...tenant,
            faviconUrl: tenant.logoUrl ?? tenant.faviconUrl ?? null,
            userCount: countMap.get(tenant.id) ?? 0,
            initialized: (countMap.get(tenant.id) ?? 0) > 0,
        }));
    }

    async createTenant(data: {
        slug: string;
        companyName: string;
        customDomain?: string;
        logoUrl?: string;
        loginTitle?: string;
        loginSubtitle?: string;
        primaryColor?: string;
        accentColor?: string;
    }) {
        return this.prisma.tenantBranding.create({
            data: {
                slug: data.slug,
                companyName: data.companyName,
                customDomain: data.customDomain || null,
                logoUrl: data.logoUrl || null,
                faviconUrl: data.logoUrl || null,
                loginTitle: data.loginTitle || null,
                loginSubtitle: data.loginSubtitle || null,
                primaryColor: data.primaryColor || '#2563eb',
                accentColor: data.accentColor || '#0f172a',
                isDefault: false,
                isActive: true,
            },
        });
    }

    async updateTenant(
        id: string,
        data: {
            companyName?: string;
            customDomain?: string | null;
            logoUrl?: string | null;
            loginTitle?: string | null;
            loginSubtitle?: string | null;
            primaryColor?: string | null;
            accentColor?: string | null;
            isActive?: boolean;
        },
    ) {
        return this.prisma.tenantBranding.update({
            where: { id },
            data: {
                ...data,
                faviconUrl: data.logoUrl === undefined ? undefined : data.logoUrl,
            },
        });
    }

    async assertPlatformAdmin(user: { tenantId?: string; role?: string }) {
        if (!user?.tenantId || user.role !== 'ADMIN') {
            throw new ForbiddenException('Platform admin access required');
        }

        const tenant = await this.getTenantById(user.tenantId);
        if (!tenant?.isDefault) {
            throw new ForbiddenException('Only the platform tenant can manage clients');
        }
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
