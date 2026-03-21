import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('duty')
    @Roles(Role.SALES_REP)
    toggleDuty(@Body() body: { isOnDuty: boolean }, @Request() req: any) {
        return this.usersService.update(req.user.userId, { isOnDuty: body.isOnDuty });
    }

    @Get('me')
    getProfile(@Request() req: any) {
        return this.usersService.findOne(req.user.userId, req.user.tenantId);
    }

    @Get('attendance')
    @Roles(Role.ADMIN)
    getAttendance(@Request() req: any) {
        return this.usersService.getAttendance(req.user.tenantId);
    }

    @Get(':id/attendance')
    @Roles(Role.ADMIN)
    getUserAttendance(@Param('id') id: string, @Request() req: any) {
        return this.usersService.getUserAttendance(id, req.user.tenantId);
    }

    @Get(':id')
    @Roles(Role.ADMIN)
    getUser(@Param('id') id: string, @Request() req: any) {
        return this.usersService.findOne(id, req.user.tenantId);
    }

    @Roles(Role.ADMIN)
    @Get()
    findAll(@Request() req: any) {
        return this.usersService.findAll(req.user.tenantId);
    }

    @Post()
    @Roles(Role.ADMIN)
    create(@Body() data: any, @Request() req: any) {
        return this.usersService.create(data, req.user.tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.usersService.update(id, data, req.user.tenantId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.usersService.remove(id, req.user.tenantId);
    }
}
