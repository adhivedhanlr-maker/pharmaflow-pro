import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
    constructor(private readonly routesService: RoutesService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() createRouteDto: any) {
        return this.routesService.create(createRouteDto);
    }

    @Get()
    findAll(@Request() req, @Query('date') date?: string, @Query('repId') repId?: string) {
        // If admin, can filter by repId. If rep, force own id.
        const userId = req.user.role === 'ADMIN' ? (repId || undefined) : req.user.userId;
        return this.routesService.findAll(userId, date);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.routesService.findOne(id);
    }

    @Patch(':id/stops/:stopId')
    updateStopStatus(
        @Param('id') id: string,
        @Param('stopId') stopId: string,
        @Body('status') status: 'PENDING' | 'COMPLETED' | 'SKIPPED',
        @Body('notes') notes?: string,
    ) {
        return this.routesService.updateStopStatus(id, stopId, status, notes);
    }
}
