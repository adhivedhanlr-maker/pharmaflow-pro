import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('parties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartiesController {
    constructor(
        private readonly partiesService: PartiesService,
        private readonly auditLogService: AuditLogService,
    ) { }

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
    async createCustomer(@Body() data: any, @Request() req: any) {
        const result = await this.partiesService.createCustomer(data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_CUSTOMER,
            entity: 'Customer',
            entityId: result.id,
            details: { name: result.name, phone: result.phone },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Put('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async updateCustomer(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        const result = await this.partiesService.updateCustomer(id, data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_CUSTOMER,
            entity: 'Customer',
            entityId: id,
            details: { name: result.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Delete('customers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async deleteCustomer(@Param('id') id: string, @Request() req: any) {
        const result = await this.partiesService.deleteCustomer(id, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.DELETE_CUSTOMER,
            entity: 'Customer',
            entityId: id,
            details: { name: result.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
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
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.WAREHOUSE_MANAGER)
    async createSupplier(@Body() data: any, @Request() req: any) {
        const result = await this.partiesService.createSupplier(data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_SUPPLIER,
            entity: 'Supplier',
            entityId: result.id,
            details: { name: result.name, phone: result.phone },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Put('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.WAREHOUSE_MANAGER)
    async updateSupplier(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        const result = await this.partiesService.updateSupplier(id, data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_SUPPLIER,
            entity: 'Supplier',
            entityId: id,
            details: { name: result.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Delete('suppliers/:id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.WAREHOUSE_MANAGER)
    async deleteSupplier(@Param('id') id: string, @Request() req: any) {
        const result = await this.partiesService.deleteSupplier(id, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.DELETE_SUPPLIER,
            entity: 'Supplier',
            entityId: id,
            details: { name: result.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Get('suppliers/:id/rate-card')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    getRateCard(@Param('id') id: string, @Request() req: any) {
        return this.partiesService.getRateCard(id, req.user.tenantId);
    }

    @Get('suppliers/:id/rate-card/:productId')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER)
    getRateCardEntry(@Param('id') id: string, @Param('productId') productId: string, @Request() req: any) {
        return this.partiesService.getRateCardEntry(id, productId, req.user.tenantId);
    }

    @Post('suppliers/:id/rate-card')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    upsertRateCard(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        const { productId, mrp, ptr, pts, nr, discountPct } = data;
        return this.partiesService.upsertRateCard(id, {
            productId,
            mrp: Number(mrp) || 0,
            ptr: Number(ptr) || 0,
            pts: Number(pts) || 0,
            nr: Number(nr) || 0,
            discountPct: Number(discountPct) || 0,
        }, req.user.tenantId);
    }

    @Delete('suppliers/:id/rate-card/:productId')
    @Roles(Role.ADMIN)
    deleteRateCardEntry(@Param('id') id: string, @Param('productId') productId: string, @Request() req: any) {
        return this.partiesService.deleteRateCardEntry(id, productId, req.user.tenantId);
    }

    @Patch('suppliers/:id/reset-balance')
    @Roles(Role.ADMIN)
    resetSupplierBalance(@Param('id') id: string, @Request() req: any) {
        return this.partiesService.resetSupplierBalance(id, req.user.tenantId);
    }

    @Patch('customers/:id/reset-balance')
    @Roles(Role.ADMIN)
    resetCustomerBalance(@Param('id') id: string, @Request() req: any) {
        return this.partiesService.resetCustomerBalance(id, req.user.tenantId);
    }
}
