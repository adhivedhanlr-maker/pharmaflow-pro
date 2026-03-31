import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminLikeRole } from '../auth/role-access.util';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, AuditLogService } from '../audit/audit-log.service';
import { randomUUID } from 'crypto';

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
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly auditLogService: AuditLogService,
    ) { }

    async resolveBranding(host?: string | null): Promise<BrandingResponse> {
        const normalizedHost = this.normalizeHost(host);
        const tenant = await this.findTenant(normalizedHost);

        // Fall back to BusinessProfile.logoUrl if TenantBranding has no logo
        let logoUrl = tenant?.logoUrl ?? null;
        if (!logoUrl && tenant?.id) {
            const profile = await this.prisma.businessProfile.findFirst({
                where: { tenantId: tenant.id },
                select: { logoUrl: true },
            });
            logoUrl = profile?.logoUrl ?? null;
        }

        return {
            id: tenant?.id,
            slug: tenant?.slug ?? 'default',
            companyName: tenant?.companyName ?? 'PharmaFlow Pro',
            logoUrl,
            primaryColor: tenant?.primaryColor ?? '#2563eb',
            accentColor: tenant?.accentColor ?? '#0f172a',
            loginTitle: tenant?.loginTitle ?? 'Welcome Back',
            loginSubtitle:
                tenant?.loginSubtitle ??
                'Sign in to manage your pharmaceutical distribution',
            faviconUrl: logoUrl ?? tenant?.faviconUrl ?? null,
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

        // For tenants without a logo URL, fall back to their BusinessProfile logo
        const tenantsWithoutLogo = tenants.filter(t => !t.logoUrl).map(t => t.id);
        const profileLogos = tenantsWithoutLogo.length === 0 ? [] : await this.prisma.businessProfile.findMany({
            where: { tenantId: { in: tenantsWithoutLogo } },
            select: { tenantId: true, logoUrl: true },
        });
        const profileLogoMap = new Map(profileLogos.map(p => [p.tenantId, p.logoUrl]));

        return tenants.map((tenant) => {
            const effectiveLogo = tenant.logoUrl ?? profileLogoMap.get(tenant.id) ?? null;
            return {
                ...tenant,
                logoUrl: effectiveLogo,
                faviconUrl: effectiveLogo ?? tenant.faviconUrl ?? null,
                userCount: countMap.get(tenant.id) ?? 0,
                initialized: (countMap.get(tenant.id) ?? 0) > 0,
            };
        });
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

    async deleteTenant(id: string) {
        const tenant = await this.prisma.tenantBranding.findUnique({
            where: { id },
        });

        if (!tenant) {
            throw new ForbiddenException('Tenant not found');
        }

        if (tenant.isDefault) {
            throw new ForbiddenException('Default/platform tenant cannot be deleted');
        }

        const relatedCounts = await Promise.all([
            this.prisma.user.count({ where: { tenantId: id } }),
            this.prisma.customer.count({ where: { tenantId: id } }),
            this.prisma.supplier.count({ where: { tenantId: id } }),
            this.prisma.product.count({ where: { tenantId: id } }),
            this.prisma.sale.count({ where: { tenantId: id } }),
            this.prisma.purchase.count({ where: { tenantId: id } }),
            this.prisma.order.count({ where: { tenantId: id } }),
            this.prisma.visit.count({ where: { tenantId: id } }),
            this.prisma.route.count({ where: { tenantId: id } }),
        ]);

        if (relatedCounts.some((count) => count > 0)) {
            throw new ForbiddenException('Tenant cannot be deleted while data exists');
        }

        return this.prisma.tenantBranding.delete({
            where: { id },
        });
    }

    async assertPlatformAdmin(user: { tenantId?: string; role?: string }) {
        if (!user?.tenantId || !isAdminLikeRole(user.role)) {
            throw new ForbiddenException('Platform admin access required');
        }

        const tenant = await this.getTenantById(user.tenantId);
        if (!tenant?.isDefault) {
            throw new ForbiddenException('Only the platform tenant can manage clients');
        }
    }

    async startSupportAccess(params: {
        actorUserId: string;
        actorRole: string;
        actorTenantId?: string;
        targetTenantId: string;
        reason: string;
        returnUrl: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const actor = await this.prisma.user.findFirst({
            where: {
                id: params.actorUserId,
                ...(params.actorTenantId ? { tenantId: params.actorTenantId } : {}),
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                tenantId: true,
            },
        });

        if (!actor) {
            throw new ForbiddenException('Support actor not found');
        }

        const targetTenant = await this.getTenantById(params.targetTenantId);
        if (!targetTenant || !targetTenant.isActive) {
            throw new ForbiddenException('Target tenant not available');
        }

        const sessionId = randomUUID();
        const startedAt = new Date().toISOString();
        const supportAccess = {
            active: true,
            sessionId,
            actorUserId: actor.id,
            actorName: actor.name,
            actorRole: actor.role,
            actorTenantId: actor.tenantId,
            targetTenantId: targetTenant.id,
            targetTenantName: targetTenant.companyName,
            targetTenantSlug: targetTenant.slug,
            targetTenantDomain: targetTenant.customDomain || `${targetTenant.slug}.pharmaflow.eflybe.com`,
            reason: params.reason,
            startedAt,
            returnUrl: params.returnUrl,
        };

        const payload = {
            sub: actor.id,
            username: actor.username,
            name: actor.name,
            role: actor.role,
            tenantId: targetTenant.id,
            supportAccess,
        };

        await this.auditLogService.log({
            userId: actor.id,
            tenantId: targetTenant.id,
            action: AuditAction.SUPPORT_ACCESS_START,
            entity: 'TenantSupportSession',
            entityId: sessionId,
            details: {
                actorRole: actor.role,
                actorTenantId: actor.tenantId,
                targetTenantId: targetTenant.id,
                targetTenantName: targetTenant.companyName,
                reason: params.reason,
                returnUrl: params.returnUrl,
                startedAt,
            },
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });

        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '2h' });
        return {
            accessToken,
            user: {
                id: actor.id,
                username: actor.username,
                name: actor.name,
                role: actor.role,
                tenantId: targetTenant.id,
                supportAccess,
            },
            targetTenant,
        };
    }

    async endSupportAccess(params: {
        actorUserId: string;
        tenantId?: string;
        supportAccess?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        if (!params.supportAccess?.active || !params.supportAccess?.sessionId) {
            throw new ForbiddenException('No active support session');
        }

        await this.auditLogService.log({
            userId: params.actorUserId,
            tenantId: params.tenantId,
            action: AuditAction.SUPPORT_ACCESS_END,
            entity: 'TenantSupportSession',
            entityId: params.supportAccess.sessionId,
            details: {
                endedAt: new Date().toISOString(),
                reason: params.supportAccess.reason,
                startedAt: params.supportAccess.startedAt,
                targetTenantId: params.supportAccess.targetTenantId,
                returnUrl: params.supportAccess.returnUrl,
            },
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });

        return { success: true };
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
