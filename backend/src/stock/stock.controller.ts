import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Get('batches')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BILLING_OPERATOR)
    findAllBatches(@Request() req: any) {
        return this.stockService.findAllBatches(req.user.tenantId);
    }

    @Patch('batches/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    updateStockManual(
        @Param('id') id: string,
        @Body() data: {
            quantity: number;
            reason: string;
            salePrice?: number;
            purchasePrice?: number;
            mrp?: number;
            ptr?: number;
            pts?: number;
        },
        @Request() req: any,
    ) {
        return this.stockService.updateStockManual(id, data.quantity, data.reason, req.user.tenantId, {
            salePrice: data.salePrice,
            purchasePrice: data.purchasePrice,
            mrp: data.mrp,
            ptr: data.ptr,
            pts: data.pts,
        });
    }

    @Get('alerts')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getStockAlerts(@Request() req: any) {
        return this.stockService.getStockAlerts(req.user.tenantId);
    }
}
