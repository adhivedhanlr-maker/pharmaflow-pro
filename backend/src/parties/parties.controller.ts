import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('parties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartiesController {
    constructor(private readonly partiesService: PartiesService) { }

    @Get('customers')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findAllCustomers() {
        return this.partiesService.findAllCustomers();
    }

    @Get('customers/search')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.SALES_REP)
    searchCustomers(@Query('q') query: string) {
        return this.partiesService.searchCustomers(query);
    }

    @Post('customers')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    createCustomer(@Body() data: any) {
        console.log('Create Customer Request:', data);
        return this.partiesService.createCustomer(data);
    }

    @Get('suppliers')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAllSuppliers() {
        return this.partiesService.findAllSuppliers();
    }

    @Post('suppliers')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    createSupplier(@Body() data: any) {
        return this.partiesService.createSupplier(data);
    }
}
