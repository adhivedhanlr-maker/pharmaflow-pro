import { Controller, Get, Query } from '@nestjs/common';
import { TenantBrandingService } from './tenant-branding.service';

@Controller('public/tenant-branding')
export class TenantBrandingController {
    constructor(private readonly tenantBrandingService: TenantBrandingService) { }

    @Get()
    async getBranding(@Query('host') host?: string) {
        return this.tenantBrandingService.resolveBranding(host);
    }
}
