import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // I need to create this
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('inventory')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get('products')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER)
    findAllProducts() {
        return this.inventoryService.findAllProducts();
    }

    @Get('products/:id')
    @Roles(Role.ADMIN, Role.BILLING_OPERATOR, Role.WAREHOUSE_MANAGER)
    findProductById(@Param('id') id: string) {
        return this.inventoryService.findProductById(id);
    }

    @Post('products')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    createProduct(@Body() data: any) {
        return this.inventoryService.createProduct(data);
    }

    @Get('alerts/expiring')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getExpiringSoon() {
        return this.inventoryService.getExpiringSoon();
    }

    @Get('alerts/low-stock')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getLowStock() {
        return this.inventoryService.getLowStock();
    }
}
