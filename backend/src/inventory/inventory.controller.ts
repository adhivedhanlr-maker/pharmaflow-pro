import { Controller, Get, Post, Put, Body, Param, Query, Delete, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OCRService } from './ocr.service';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(
        private readonly inventoryService: InventoryService,
        private readonly ocrService: OCRService
    ) { }

    @Post('extract-invoice')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async extractInvoice(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new Error('No file uploaded');
        }
        return this.ocrService.extractFromInvoice(file);
    }

    @Delete('products/:id')
    @Roles(Role.ADMIN)
    deleteProduct(@Param('id') id: string, @Request() req: any) {
        return this.inventoryService.deleteProduct(id, req.user.tenantId);
    }

    @Delete('batches/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    deleteBatch(@Param('id') id: string, @Request() req: any) {
        return this.inventoryService.deleteBatch(id, req.user.tenantId);
    }

    @Get('products')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER, Role.SALES_REP)
    findAllProducts(
        @Request() req: any,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
        @Query('includeBatches') includeBatches?: string,
        @Query('onlyWithStock') onlyWithStock?: string,
    ) {
        return this.inventoryService.findAllProducts({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
            includeBatches: includeBatches === 'false' ? false : true,
            onlyWithStock: onlyWithStock === 'true',
        }, req.user.tenantId);
    }

    @Get('products/:id')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER, Role.SALES_REP)
    findProductById(@Param('id') id: string, @Request() req: any) {
        return this.inventoryService.findProductById(id, req.user.tenantId);
    }

    @Post('products')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createProduct(@Body() data: any, @Request() req: any) {
        return this.inventoryService.createProduct(data, req.user.tenantId);
    }

    @Put('products/:id')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    updateProduct(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.inventoryService.updateProduct(id, data, req.user.tenantId);
    }

    @Post('batches')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createBatch(@Body() data: any, @Request() req: any) {
        return this.inventoryService.createBatch(data, req.user.tenantId);
    }

    @Get('alerts/expiring')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getExpiringSoon(@Request() req: any) {
        return this.inventoryService.getExpiringSoon(req.user.tenantId);
    }

    @Get('alerts/low-stock')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getLowStock(@Request() req: any) {
        return this.inventoryService.getLowStock(req.user.tenantId);
    }

    @Get('products/barcode/:code')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER, Role.SALES_REP)
    findByBarcode(@Param('code') code: string, @Request() req: any) {
        return this.inventoryService.findByBarcode(code, req.user.tenantId);
    }
}
