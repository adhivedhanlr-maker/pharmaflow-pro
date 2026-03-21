import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { isAdminLikeRole } from '../auth/role-access.util';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
    constructor(private readonly routesService: RoutesService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() createRouteDto: any, @Request() req: any) {
        return this.routesService.create(createRouteDto, req.user.tenantId);
    }

    @Get()
    findAll(@Request() req: any, @Query('date') date?: string, @Query('repId') repId?: string) {
        // If admin, can filter by repId. If rep, force own id.
        const userId = isAdminLikeRole(req.user.role) ? (repId || undefined) : req.user.userId;
        return this.routesService.findAll(userId, req.user.tenantId, date);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.routesService.findOne(id, req.user.tenantId);
    }

    @Patch(':id/stops/:stopId')
    updateStopStatus(
        @Param('id') id: string,
        @Param('stopId') stopId: string,
        @Body('status') status: 'PENDING' | 'COMPLETED' | 'SKIPPED',
        @Body('notes') notes?: string,
        @Request() req?: any,
    ) {
        return this.routesService.updateStopStatus(id, stopId, status, notes, req?.user?.tenantId);
    }
}
