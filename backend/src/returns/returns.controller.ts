import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) { }

    @Post('sales')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR)
    createSalesReturn(@Body() data: any) {
        return this.returnsService.createSalesReturn(data);
    }

    @Post('purchase')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createPurchaseReturn(@Body() data: any) {
        return this.returnsService.createPurchaseReturn(data);
    }
}
