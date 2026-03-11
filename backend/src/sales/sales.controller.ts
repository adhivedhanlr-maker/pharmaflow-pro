import { Controller, Post, Get, Patch, Body, UseGuards, Request, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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
        return this.salesService.createInvoice(data, req.user?.userId, req.user?.tenantId);
    }

    @Get('invoices')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT, Role.SALES_REP)
    findAll(@Request() req: any) {
        return this.salesService.findAll(req.user);
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
        return this.salesService.getSalesAnalytics(req.user?.tenantId, {
            range,
            startDate,
            endDate,
        });
    }

    @Get(':id/delivery-proof')
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SALES_REP)
    async getDeliveryProof(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
        const photo = await this.salesService.getDeliveryProof(id, req.user?.tenantId);
        if (!photo || !photo.proofUrl) {
            return res.status(404).send('Photo not found');
        }

        // Handle base64
        const base64Data = photo.proofUrl.split(',')[1] || photo.proofUrl;
        const img = Buffer.from(base64Data, 'base64');

        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': img.length
        });
        res.end(img);
    }
}

