import { Controller, Get, Patch, Param, UseGuards, Post } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BILLING_OPERATOR)
    getNotifications() {
        return this.alertsService.getNotifications();
    }

    @Patch(':id/read')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BILLING_OPERATOR)
    markAsRead(@Param('id') id: string) {
        return this.alertsService.markAsRead(id);
    }

    @Post('check-now')
    @Roles(Role.ADMIN)
    manualCheck() {
        return this.alertsService.checkInventory();
    }
}
