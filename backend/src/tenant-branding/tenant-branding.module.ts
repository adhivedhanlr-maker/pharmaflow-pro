import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantBrandingAdminController, TenantBrandingController } from './tenant-branding.controller';
import { TenantBrandingService } from './tenant-branding.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        PrismaModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'secretKey',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    controllers: [TenantBrandingController, TenantBrandingAdminController],
    providers: [TenantBrandingService],
    exports: [TenantBrandingService],
})
export class TenantBrandingModule { }
