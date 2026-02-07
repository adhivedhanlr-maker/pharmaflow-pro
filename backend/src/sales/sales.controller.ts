import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post('invoices')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.SALES_REP)
    createInvoice(@Body() data: any, @Request() req: any) {
        return this.salesService.createInvoice(data, req.user?.userId);
    }

    @Get('invoices')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findAll() {
        return this.salesService.findAll();
    }
}
