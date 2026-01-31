import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
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
}
