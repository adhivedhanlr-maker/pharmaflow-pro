import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
    constructor(
        private readonly purchasesService: PurchasesService,
        private readonly auditLogService: AuditLogService,
    ) { }

    @Post()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    async createPurchase(@Body() data: any, @Request() req: any) {
        const result = await this.purchasesService.createPurchase(data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_PURCHASE,
            entity: 'Purchase',
            entityId: result.id,
            details: { billNumber: result.billNumber, supplierId: result.supplierId, netAmount: result.netAmount },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Get()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAll(@Request() req: any) {
        return this.purchasesService.findAll(req.user.tenantId);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    async updatePurchase(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        const result = await this.purchasesService.updatePurchase(id, data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_PURCHASE,
            entity: 'Purchase',
            entityId: id,
            details: { purchaseId: id, billNumber: result.billNumber },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    async deletePurchase(@Param('id') id: string, @Request() req: any) {
        const result = await this.purchasesService.deletePurchase(id, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.DELETE_PURCHASE,
            entity: 'Purchase',
            entityId: id,
            details: { purchaseId: id, billNumber: result.billNumber },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }
}
