import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
    // Authentication
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
    ENABLE_2FA = 'ENABLE_2FA',
    DISABLE_2FA = 'DISABLE_2FA',

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
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};

        if (params.userId) where.userId = params.userId;
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

        return { logs, total };
    }

    async getRecentActivity(userId: string, limit: number = 10) {
        return this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
