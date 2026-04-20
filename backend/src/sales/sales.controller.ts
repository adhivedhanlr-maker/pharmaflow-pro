import { Controller, Post, Get, Patch, Delete, Body, UseGuards, Request, Param, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
    constructor(
        private readonly salesService: SalesService,
        private readonly auditLogService: AuditLogService,
    ) { }

    @Post('admin/renumber-invoices')
    @Roles(Role.ADMIN)
    async renumberInvoices(@Request() req: any) {
        if (!req.user.tenantId) throw new BadRequestException('Tenant context required');
        return this.salesService.renumberLegacyInvoices(req.user.tenantId);
    }

    @Post('admin/sync-sequence')
    @Roles(Role.ADMIN)
    async syncSequence(@Request() req: any) {
        if (!req.user.tenantId) throw new BadRequestException('Tenant context required');
        return this.salesService.syncInvoiceSequences(req.user.tenantId);
    }

    @Post('invoices')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.SALES_REP)
    async createInvoice(@Body() data: any, @Request() req: any) {
        const result = await this.salesService.createInvoice(data, req.user?.userId, req.user?.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_SALE,
            entity: 'Sale',
            entityId: result.id,
            details: { invoiceNumber: result.invoiceNumber, netAmount: result.netAmount },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Get('next-invoice-number')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.SALES_REP)
    getNextInvoiceNumber(@Request() req: any) {
        return this.salesService.previewNextInvoiceNumber(req.user?.tenantId);
    }

    @Get('invoices')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findAll(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salesService.findAll(req.user, startDate, endDate);
    }

    @Get('receivables')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT)
    getReceivables(@Request() req: any) {
        return this.salesService.getReceivables(req.user?.tenantId);
    }

    @Post(':id/verify-delivery')
    @Roles(Role.ADMIN, Role.SALES_REP)
    async verifyDelivery(
        @Param('id') id: string,
        @Body() body: {
            otp: string;
            proofUrl?: string;
            signatureUrl?: string,
            deliveryLatitude?: number,
            deliveryLongitude?: number,
            deliveryInfo?: string
        },
        @Request() req: any,
    ) {
        return this.salesService.verifyDelivery(
            id,
            body.otp,
            body.proofUrl,
            body.signatureUrl,
            body.deliveryLatitude,
            body.deliveryLongitude,
            body.deliveryInfo,
            req.user?.tenantId
        );
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async deleteSale(@Param('id') id: string, @Request() req: any) {
        const result = await this.salesService.deleteSale(id, req.user?.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.DELETE_SALE,
            entity: 'Sale',
            entityId: id,
            details: { invoiceNumber: result.invoiceNumber },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Patch(':id/assign-rep')
    @Roles(Role.ADMIN)
    assignRep(@Param('id') id: string, @Body('repId') repId: string, @Request() req: any) {
        return this.salesService.assignRep(id, repId, req.user?.tenantId);
    }

    @Get('analytics')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    getAnalytics(
        @Request() req: any,
        @Query('range') range?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salesService.getSalesAnalytics(req.user?.tenantId, { range, startDate, endDate });
    }

    @Get(':id/delivery-proof')
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SALES_REP)
    async getDeliveryProof(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
        const photo = await this.salesService.getDeliveryProof(id, req.user?.tenantId);
        if (!photo || !photo.proofUrl) return res.status(404).send('Photo not found');
        const base64Data = photo.proofUrl.split(',')[1] || photo.proofUrl;
        const img = Buffer.from(base64Data, 'base64');
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': img.length });
        res.end(img);
    }
}
