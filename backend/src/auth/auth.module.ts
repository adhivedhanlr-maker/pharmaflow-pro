import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { TenantBrandingModule } from '../tenant-branding/tenant-branding.module';

@Module({
    imports: [
        PassportModule,
        TenantBrandingModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '7d' },
        }),
    ],
    providers: [AuthService, JwtStrategy, TwoFactorService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }
