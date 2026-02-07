import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
    constructor(private readonly visitsService: VisitsService) { }

    @Post('check-in')
    @Roles(Role.SALES_REP, Role.ADMIN)
    checkIn(@Body() dto: CheckInDto, @Request() req: any) {
        return this.visitsService.checkIn(req.user?.userId, dto);
    }

    @Get('report')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    getReports() {
        return this.visitsService.getReports();
    }

    @Get('my-visits')
    @Roles(Role.SALES_REP)
    getMyVisits(@Request() req: any) {
        return this.visitsService.getRepVisits(req.user?.userId);
    }

    @Get('active-locations')
    @Roles(Role.ADMIN, Role.ACCOUNTANT)
    getActiveLocations() {
        return this.visitsService.getActiveRepLocations();
    }

    @Post('sync-location')
    @Roles(Role.SALES_REP)
    syncLocation(@Body() data: { latitude: number, longitude: number }, @Request() req: any) {
        return this.visitsService.syncLocation(req.user?.userId, data.latitude, data.longitude);
    }
    @Get('route')
    @Roles(Role.ADMIN, Role.SALES_REP)
    async getRoute(
        @Request() req: any,
        @Query('date') date: string,
        @Query('repId') repId?: string
    ) {
        // If rep, force their own ID. If admin, allow passing repId (or default to self if they want to see their own)
        const targetRepId = req.user.role === Role.ADMIN ? (repId || req.user.userId) : req.user.userId;
        return this.visitsService.getRoute(targetRepId, date);
    }
}
