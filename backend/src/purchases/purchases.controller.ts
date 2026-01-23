import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('purchases')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createPurchase(@Body() data: any) {
        return this.purchasesService.createPurchase(data);
    }

    @Get()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAll() {
        return this.purchasesService.findAll();
    }
}
