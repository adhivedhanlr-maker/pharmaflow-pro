import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly auditLogService: AuditLogService,
    ) { }

    @Post('duty')
    @Roles(Role.SALES_REP)
    toggleDuty(@Body() body: { isOnDuty: boolean }, @Request() req: any) {
        return this.usersService.update(req.user.userId, { isOnDuty: body.isOnDuty }, req.user.tenantId);
    }

    @Patch('me/password')
    changePassword(@Body() body: any, @Request() req: any) {
        const { currentPassword, newPassword } = body;
        return this.usersService.changePassword(req.user.userId, req.user.tenantId, currentPassword, newPassword);
    }

    @Get('me')
    getProfile(@Request() req: any) {
        if (req.user?.supportAccess?.active) {
            return {
                id: req.user.userId,
                username: req.user.username,
                name: req.user.name || req.user.supportAccess.actorName,
                role: req.user.role,
                tenantId: req.user.tenantId,
                canGenerateInvoice: false,
                isOnDuty: false,
                supportAccess: req.user.supportAccess,
            };
        }
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
    findAll(@Request() req: any, @Query('role') role?: string) {
        return this.usersService.findAll(req.user.tenantId, role);
    }

    @Post()
    @Roles(Role.ADMIN)
    async create(@Body() data: any, @Request() req: any) {
        const result = await this.usersService.create(data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.CREATE_USER,
            entity: 'User',
            entityId: result.id,
            details: { name: result.name, role: result.role, username: result.username },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        const result = await this.usersService.update(id, data, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.UPDATE_USER,
            entity: 'User',
            entityId: id,
            details: { userId: id, changes: Object.keys(data) },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string, @Request() req: any) {
        const result = await this.usersService.remove(id, req.user.tenantId);
        await this.auditLogService.log({
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            action: AuditAction.DELETE_USER,
            entity: 'User',
            entityId: id,
            details: { name: result.name, role: result.role },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result;
    }
}
