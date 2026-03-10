import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantBrandingAdminController, TenantBrandingController } from './tenant-branding.controller';
import { TenantBrandingService } from './tenant-branding.service';

@Module({
    imports: [PrismaModule],
    controllers: [TenantBrandingController, TenantBrandingAdminController],
    providers: [TenantBrandingService],
    exports: [TenantBrandingService],
})
export class TenantBrandingModule { }
