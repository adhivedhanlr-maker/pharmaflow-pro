import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantBrandingService } from './tenant-branding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('public/tenant-branding')
export class TenantBrandingController {
    constructor(private readonly tenantBrandingService: TenantBrandingService) { }

    @Get()
    async getBranding(@Query('host') host?: string) {
        return this.tenantBrandingService.resolveBranding(host);
    }
}

@Controller('tenant-branding/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantBrandingAdminController {
    constructor(private readonly tenantBrandingService: TenantBrandingService) { }

    @Get()
    async listTenants(@Req() req: any) {
        await this.tenantBrandingService.assertPlatformAdmin(req.user);
        return this.tenantBrandingService.listTenants();
    }

    @Post()
    async createTenant(
        @Req() req: any,
        @Body() body: {
            slug: string;
            companyName: string;
            customDomain?: string;
            logoUrl?: string;
            loginTitle?: string;
            loginSubtitle?: string;
            primaryColor?: string;
            accentColor?: string;
        },
    ) {
        await this.tenantBrandingService.assertPlatformAdmin(req.user);
        return this.tenantBrandingService.createTenant(body);
    }

    @Patch(':id')
    async updateTenant(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: {
            companyName?: string;
            customDomain?: string | null;
            logoUrl?: string | null;
            loginTitle?: string | null;
            loginSubtitle?: string | null;
            primaryColor?: string | null;
            accentColor?: string | null;
            isActive?: boolean;
        },
    ) {
        await this.tenantBrandingService.assertPlatformAdmin(req.user);
        return this.tenantBrandingService.updateTenant(id, body);
    }

    @Delete(':id')
    async deleteTenant(@Req() req: any, @Param('id') id: string) {
        await this.tenantBrandingService.assertPlatformAdmin(req.user);
        return this.tenantBrandingService.deleteTenant(id);
    }
}
