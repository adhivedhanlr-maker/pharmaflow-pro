import { Controller, Get, Patch, Param, UseGuards, Post, Request } from '@nestjs/common';
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
    getNotifications(@Request() req: any) {
        return this.alertsService.getNotifications(req.user?.tenantId);
    }

    @Patch(':id/read')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.BILLING_OPERATOR)
    markAsRead(@Param('id') id: string, @Request() req: any) {
        return this.alertsService.markAsRead(id, req.user?.tenantId);
    }

    @Post('check-now')
    @Roles(Role.ADMIN)
    manualCheck() {
        return this.alertsService.checkInventory();
    }
}
