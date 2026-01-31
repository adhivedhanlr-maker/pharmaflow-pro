import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
    findAllCustomers(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
    ) {
        return this.partiesService.findAllCustomers({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
        });
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
    findAllSuppliers(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
    ) {
        return this.partiesService.findAllSuppliers({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
        });
    }

    @Post('suppliers')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    createSupplier(@Body() data: any) {
        return this.partiesService.createSupplier(data);
    }

    @Put('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    updateCustomer(@Param('id') id: string, @Body() data: any) {
        return this.partiesService.updateCustomer(id, data);
    }

    @Delete('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    deleteCustomer(@Param('id') id: string) {
        return this.partiesService.deleteCustomer(id);
    }

    @Put('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    updateSupplier(@Param('id') id: string, @Body() data: any) {
        return this.partiesService.updateSupplier(id, data);
    }

    @Delete('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    deleteSupplier(@Param('id') id: string) {
        return this.partiesService.deleteSupplier(id);
    }
}
