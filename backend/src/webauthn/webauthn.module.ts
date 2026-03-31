import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebAuthnService } from './webauthn.service';
import { WebAuthnController } from './webauthn.controller';
import { TenantBrandingModule } from '../tenant-branding/tenant-branding.module';

@Module({
    imports: [
        TenantBrandingModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
    ],
    providers: [WebAuthnService],
    controllers: [WebAuthnController],
})
export class WebAuthnModule { }
