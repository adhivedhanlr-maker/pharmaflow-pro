import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
    // Authentication
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
    ENABLE_2FA = 'ENABLE_2FA',
    DISABLE_2FA = 'DISABLE_2FA',
    SUPPORT_ACCESS_START = 'SUPPORT_ACCESS_START',
    SUPPORT_ACCESS_END = 'SUPPORT_ACCESS_END',

    // User Management
    CREATE_USER = 'CREATE_USER',
    UPDATE_USER = 'UPDATE_USER',
    DELETE_USER = 'DELETE_USER',

    // Sales
    CREATE_SALE = 'CREATE_SALE',
    UPDATE_SALE = 'UPDATE_SALE',
    DELETE_SALE = 'DELETE_SALE',

    // Inventory
    CREATE_PRODUCT = 'CREATE_PRODUCT',
    UPDATE_PRODUCT = 'UPDATE_PRODUCT',
    DELETE_PRODUCT = 'DELETE_PRODUCT',
    UPDATE_INVENTORY = 'UPDATE_INVENTORY',

    // Purchases
    CREATE_PURCHASE = 'CREATE_PURCHASE',
    UPDATE_PURCHASE = 'UPDATE_PURCHASE',
    DELETE_PURCHASE = 'DELETE_PURCHASE',

    // Customers
    CREATE_CUSTOMER = 'CREATE_CUSTOMER',
    UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
    DELETE_CUSTOMER = 'DELETE_CUSTOMER',

    // Suppliers
    CREATE_SUPPLIER = 'CREATE_SUPPLIER',
    UPDATE_SUPPLIER = 'UPDATE_SUPPLIER',
    DELETE_SUPPLIER = 'DELETE_SUPPLIER',

    // Settings
    UPDATE_BUSINESS_PROFILE = 'UPDATE_BUSINESS_PROFILE',
}

@Injectable()
export class AuditLogService {
    constructor(private prisma: PrismaService) { }

    async log(params: {
        userId: string;
        tenantId?: string;
        action: AuditAction | string;
        entity?: string;
        entityId?: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    tenantId: params.tenantId,
                    action: params.action,
                    entity: params.entity,
                    entityId: params.entityId,
                    details: params.details || {},
                    ipAddress: params.ipAddress,
                    userAgent: params.userAgent,
                },
            });
        } catch (error) {
            // Log errors but don't fail the main operation
            console.error('Failed to create audit log:', error);
        }
    }

    async getLogs(params: {
        userId?: string;
        tenantId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};

        if (params.userId) where.userId = params.userId;
        if (params.tenantId) where.tenantId = params.tenantId;
        if (params.action) where.action = params.action;
        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) where.createdAt.gte = params.startDate;
            if (params.endDate) where.createdAt.lte = params.endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: params.limit || 100,
                skip: params.offset || 0,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        // Attach user name/role without a FK — safe even if user was deleted
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
        const users = userIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, role: true },
            })
            : [];
        const userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, role: u.role }]));

        return {
            logs: logs.map(l => ({ ...l, user: userMap[l.userId] ?? null })),
            total,
        };
    }

    async getRecentActivity(userId: string, tenantId?: string, limit: number = 10) {
        const logs = await this.prisma.auditLog.findMany({
            where: { userId, ...(tenantId ? { tenantId } : {}) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const user = logs.length > 0
            ? await this.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, role: true },
            })
            : null;

        return logs.map(l => ({ ...l, user }));
    }
}
