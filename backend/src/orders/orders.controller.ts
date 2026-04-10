import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly auditLogService: AuditLogService,
    ) { }

    @Post()
    @Roles(Role.SALES_REP, Role.ADMIN)
    async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
        const result = await this.ordersService.create(req.user.userId, req.user.tenantId, createOrderDto);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_ORDER,
            entity: 'Order',
            entityId: result.id,
            details: { customerName: result.customer?.name, itemCount: result.items?.length ?? 0 },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Get()
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findAll(@Request() req: any) {
        return this.ordersService.findAll(req.user);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.ordersService.findOne(id, req.user.tenantId);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR)
    async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
        const result = await this.ordersService.updateStatus(id, status, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_ORDER_STATUS,
            entity: 'Order',
            entityId: id,
            details: { status, customerName: result.customer?.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Post(':id/convert')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR)
    async convert(@Param('id') id: string, @Request() req: any) {
        const result = await this.ordersService.convert(id, req.user.userId, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CONVERT_ORDER,
            entity: 'Order',
            entityId: id,
            details: { invoiceNumber: result.invoiceNumber, customerName: result.customer?.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }
}
