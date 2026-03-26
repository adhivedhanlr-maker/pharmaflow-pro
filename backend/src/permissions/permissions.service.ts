import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ALL_PERMISSIONS = [
    'billing',
    'purchases',
    'stock',
    'reports',
    'parties',
    'returns',
    'sales_history',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

/** Hardcoded defaults — used when no DB entry exists for a role */
export const ROLE_DEFAULTS: Record<string, string[]> = {
    ADMIN: [...ALL_PERMISSIONS],
    DEVELOPER: [...ALL_PERMISSIONS],
    BILLING_OPERATOR: ['billing', 'parties', 'sales_history', 'returns'],
    WAREHOUSE_MANAGER: ['purchases', 'stock', 'returns'],
    ACCOUNTANT: ['reports', 'sales_history', 'parties'],
    SALES_REP: [],
};

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    /** Returns the effective permissions map for all roles for a tenant */
    async getRolePermissions(tenantId: string): Promise<Record<string, string[]>> {
        const stored = await this.prisma.rolePermission.findMany({
            where: { tenantId },
        });

        const map: Record<string, string[]> = { ...ROLE_DEFAULTS };
        for (const entry of stored) {
            map[entry.role] = entry.permissions;
        }
        return map;
    }

    /** Upserts permissions for a single role */
    async updateRolePermissions(tenantId: string, role: string, permissions: string[]) {
        return this.prisma.rolePermission.upsert({
            where: { tenantId_role: { tenantId, role } },
            update: { permissions },
            create: { tenantId, role, permissions },
        });
    }

    /** Resets a role back to system defaults by deleting the DB override */
    async resetRolePermissions(tenantId: string, role: string) {
        await this.prisma.rolePermission.deleteMany({
            where: { tenantId, role },
        });
        return { role, permissions: ROLE_DEFAULTS[role] ?? [] };
    }
}
