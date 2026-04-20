import { Controller, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
    constructor(
        private readonly stockService: StockService,
        private readonly auditLogService: AuditLogService,
    ) { }

    @Get('batches')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BILLING_OPERATOR)
    findAllBatches(@Request() req: any) {
        return this.stockService.findAllBatches(req.user.tenantId);
    }

    @Patch('batches/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    async updateStockManual(
        @Param('id') id: string,
        @Body() data: {
            quantity: number;
            reason: string;
            salePrice?: number;
            purchasePrice?: number;
            mrp?: number;
            ptr?: number;
            pts?: number;
            nr?: number;
        },
        @Request() req: any,
    ) {
        const result = await this.stockService.updateStockManual(id, data.quantity, data.reason, req.user.tenantId, {
            salePrice: data.salePrice,
            purchasePrice: data.purchasePrice,
            mrp: data.mrp,
            ptr: data.ptr,
            pts: data.pts,
            nr: data.nr,
        });
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_INVENTORY,
            entity: 'Batch',
            entityId: id,
            details: {
                batchId: id,
                batchNumber: result.batchNumber,
                productName: result.product?.name,
                oldQty: result.previousStock,
                newQty: data.quantity,
                reason: data.reason,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Get('ledger')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    getStockLedger(
        @Request() req: any,
        @Query('productId') productId?: string,
        @Query('batchId') batchId?: string,
    ) {
        return this.stockService.getStockLedger(req.user.tenantId, productId, batchId);
    }

    @Get('alerts')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getStockAlerts(@Request() req: any) {
        return this.stockService.getStockAlerts(req.user.tenantId);
    }
}
