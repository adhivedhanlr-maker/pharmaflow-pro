import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PermissionsService, ALL_PERMISSIONS } from './permissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    /** GET /permissions/all — returns the list of available permission keys */
    @Get('all')
    getAllPermissions() {
        return { permissions: ALL_PERMISSIONS };
    }

    /** GET /permissions/roles — returns role→permissions map for this tenant */
    @Get('roles')
    @Roles(Role.ADMIN)
    getRolePermissions(@Request() req: any) {
        return this.permissionsService.getRolePermissions(req.user.tenantId);
    }

    /** PATCH /permissions/roles/:role — update a role's permissions */
    @Patch('roles/:role')
    @Roles(Role.ADMIN)
    updateRolePermissions(
        @Param('role') role: string,
        @Body() body: { permissions: string[] },
        @Request() req: any,
    ) {
        return this.permissionsService.updateRolePermissions(req.user.tenantId, role, body.permissions);
    }

    /** DELETE /permissions/roles/:role — reset role to system defaults */
    @Delete('roles/:role')
    @Roles(Role.ADMIN)
    resetRolePermissions(@Param('role') role: string, @Request() req: any) {
        return this.permissionsService.resetRolePermissions(req.user.tenantId, role);
    }
}
