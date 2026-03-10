import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
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
        @Request() req: any,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
    ) {
        return this.partiesService.findAllCustomers({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
        }, req.user.tenantId);
    }

    @Get('customers/search')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.SALES_REP)
    searchCustomers(@Query('q') query: string, @Request() req: any) {
        return this.partiesService.searchCustomers(query, req.user.tenantId);
    }

    @Post('customers')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    createCustomer(@Body() data: any, @Request() req: any) {
        console.log('Create Customer Request:', data);
        return this.partiesService.createCustomer(data, req.user.tenantId);
    }

    @Get('suppliers')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAllSuppliers(
        @Request() req: any,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
    ) {
        return this.partiesService.findAllSuppliers({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
        }, req.user.tenantId);
    }

    @Post('suppliers')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    createSupplier(@Body() data: any, @Request() req: any) {
        return this.partiesService.createSupplier(data, req.user.tenantId);
    }

    @Put('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    updateCustomer(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.partiesService.updateCustomer(id, data, req.user.tenantId);
    }

    @Delete('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    deleteCustomer(@Param('id') id: string, @Request() req: any) {
        return this.partiesService.deleteCustomer(id, req.user.tenantId);
    }

    @Put('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    updateSupplier(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.partiesService.updateSupplier(id, data, req.user.tenantId);
    }

    @Delete('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    deleteSupplier(@Param('id') id: string, @Request() req: any) {
        return this.partiesService.deleteSupplier(id, req.user.tenantId);
    }
}
