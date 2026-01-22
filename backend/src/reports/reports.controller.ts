import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('gst')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    getGstReport(
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        return this.reportsService.getGstReport(new Date(start), new Date(end));
    }

    @Get('expiry-forecast')
    @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
    getExpiryForecast() {
        return this.reportsService.getExpiryForecast();
    }

    @Get('profitability')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    getProfitability() {
        return this.reportsService.getProfitabilitySummary();
    }
}
