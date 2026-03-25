import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createPurchase(@Body() data: any, @Request() req: any) {
        return this.purchasesService.createPurchase(data, req.user.tenantId);
    }

    @Get()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAll(@Request() req: any) {
        return this.purchasesService.findAll(req.user.tenantId);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    updatePurchase(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.purchasesService.updatePurchase(id, data, req.user.tenantId);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    deletePurchase(@Param('id') id: string, @Request() req: any) {
        return this.purchasesService.deletePurchase(id, req.user.tenantId);
    }
}
