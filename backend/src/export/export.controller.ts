import {
    Controller, Get, Post, Query, Req, Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
    constructor(private readonly exportService: ExportService) { }

    // ── Exports ──────────────────────────────────────────────────────────────

    @Get('customers')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async exportCustomers(@Req() req: any, @Res() res: any) {
        const buffer = await this.exportService.exportCustomers(req.user.tenantId);
        res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('suppliers')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async exportSuppliers(@Req() req: any, @Res() res: any) {
        const buffer = await this.exportService.exportSuppliers(req.user.tenantId);
        res.setHeader('Content-Disposition', 'attachment; filename=suppliers.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('stock')
    @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.WAREHOUSE_MANAGER)
    async exportStock(@Req() req: any, @Res() res: any) {
        const buffer = await this.exportService.exportStock(req.user.tenantId);
        res.setHeader('Content-Disposition', 'attachment; filename=stock.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('invoices')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async exportInvoices(
        @Req() req: any,
        @Res() res: any,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const buffer = await this.exportService.exportInvoices(req.user.tenantId, from, to);
        res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('purchases')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    async exportPurchases(
        @Req() req: any,
        @Res() res: any,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const buffer = await this.exportService.exportPurchases(req.user.tenantId, from, to);
        res.setHeader('Content-Disposition', 'attachment; filename=purchases.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('all')
    @Roles(Role.ADMIN)
    async exportAll(@Req() req: any, @Res() res: any) {
        const buffer = await this.exportService.exportAll(req.user.tenantId);
        res.setHeader('Content-Disposition', 'attachment; filename=pharmaflow-backup.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    // ── Import templates ─────────────────────────────────────────────────────

    @Get('template/customers')
    @Roles(Role.ADMIN)
    getCustomerTemplate(@Res() res: any) {
        const buffer = this.exportService.getCustomerTemplate();
        res.setHeader('Content-Disposition', 'attachment; filename=customers-template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('template/suppliers')
    @Roles(Role.ADMIN)
    getSupplierTemplate(@Res() res: any) {
        const buffer = this.exportService.getSupplierTemplate();
        res.setHeader('Content-Disposition', 'attachment; filename=suppliers-template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    @Get('template/products')
    @Roles(Role.ADMIN)
    getProductTemplate(@Res() res: any) {
        const buffer = this.exportService.getProductTemplate();
        res.setHeader('Content-Disposition', 'attachment; filename=products-template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }

    // ── Imports ──────────────────────────────────────────────────────────────

    @Post('import/customers')
    @Roles(Role.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async importCustomers(@Req() req: any, @UploadedFile() file: any) {
        return this.exportService.importCustomers(req.user.tenantId, file.buffer);
    }

    @Post('import/suppliers')
    @Roles(Role.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async importSuppliers(@Req() req: any, @UploadedFile() file: any) {
        return this.exportService.importSuppliers(req.user.tenantId, file.buffer);
    }

    @Post('import/products')
    @Roles(Role.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async importProducts(@Req() req: any, @UploadedFile() file: any) {
        return this.exportService.importProducts(req.user.tenantId, file.buffer);
    }
}
