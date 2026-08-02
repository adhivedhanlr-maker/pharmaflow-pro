import { Controller, Post, Body, UseGuards, Get, Param, Request } from '@nestjs/common';
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
    createSalesReturn(@Body() data: any, @Request() req: any) {
        return this.returnsService.createSalesReturn(data, req.user.tenantId);
    }

    @Post('purchase')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createPurchaseReturn(@Body() data: any, @Request() req: any) {
        return this.returnsService.createPurchaseReturn(data, req.user.tenantId);
    }

    @Get('sales/:invoiceNumber')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR)
    getSaleForReturn(@Param('invoiceNumber') invoiceNumber: string, @Request() req: any) {
        return this.returnsService.getSaleForReturn(invoiceNumber, req.user.tenantId);
    }

    @Get('purchase/:billNumber')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getPurchaseForReturn(@Param('billNumber') billNumber: string, @Request() req: any) {
        return this.returnsService.getPurchaseForReturn(billNumber, req.user.tenantId);
    }

    @Get('credit-notes')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT)
    findAllCreditNotes(@Request() req: any) {
        return this.returnsService.findAllCreditNotes(req.user.tenantId);
    }

    @Get('credit-notes/:id')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.ACCOUNTANT)
    findCreditNoteById(@Param('id') id: string, @Request() req: any) {
        return this.returnsService.findCreditNoteById(id, req.user.tenantId);
    }

    @Get('debit-notes')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findAllDebitNotes(@Request() req: any) {
        return this.returnsService.findAllDebitNotes(req.user.tenantId);
    }

    @Get('debit-notes/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.ACCOUNTANT)
    findDebitNoteById(@Param('id') id: string, @Request() req: any) {
        return this.returnsService.findDebitNoteById(id, req.user.tenantId);
    }
}
