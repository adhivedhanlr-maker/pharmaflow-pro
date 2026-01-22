import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
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
    findAllBatches() {
        return this.stockService.findAllBatches();
    }

    @Patch('batches/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    updateStockManual(
        @Param('id') id: string,
        @Body() data: { quantity: number; reason: string },
    ) {
        return this.stockService.updateStockManual(id, data.quantity, data.reason);
    }

    @Get('alerts')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getStockAlerts() {
        return this.stockService.getStockAlerts();
    }
}
