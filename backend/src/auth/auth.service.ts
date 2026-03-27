import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PasswordValidator } from './password-validator';
import { TwoFactorService } from './two-factor.service';
import { TenantBrandingService } from '../tenant-branding/tenant-branding.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private twoFactorService: TwoFactorService,
        private tenantBrandingService: TenantBrandingService,
    ) { }

    async register(data: any, host?: string) {
        // Validate password strength
        const validation = PasswordValidator.validate(data.password);
        if (!validation.isValid) {
            throw new BadRequestException({
                message: 'Password does not meet requirements',
                errors: validation.errors
            });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const tenant = await this.tenantBrandingService.resolveTenant(host);
        if (!tenant) {
            throw new BadRequestException('Unknown tenant');
        }

        try {
            const user = await this.prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
                    tenantId: tenant.id,
                },
            });
            delete (user as any).password;
            return user;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('Username already exists');
            }
            throw error;
        }
    }

    async login(username: string, pass: string, host?: string) {
        const tenant = await this.tenantBrandingService.resolveTenant(host);
        if (!tenant) {
            throw new UnauthorizedException('Unknown tenant');
        }

        const user = await this.prisma.user.findFirst({
            where: {
                username,
                tenantId: tenant.id,
            },
        });

        if (!user || !(await bcrypt.compare(pass, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            return {
                requires2FA: true,
                message: 'Please enter your 2FA code',
            };
        }

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
        };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                canGenerateInvoice: user.canGenerateInvoice,
                tenantId: user.tenantId,
            },
        };
    }

    async verify2FAAndLogin(username: string, token: string, host?: string) {
        const tenant = await this.tenantBrandingService.resolveTenant(host);
        if (!tenant) {
            throw new UnauthorizedException('Unknown tenant');
        }

        const user = await this.prisma.user.findFirst({
            where: {
                username,
                tenantId: tenant.id,
            },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new UnauthorizedException('Invalid request');
        }

        // Verify the 2FA token
        const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
        };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                canGenerateInvoice: user.canGenerateInvoice,
                tenantId: user.tenantId,
            },
        };
    }

    async recoverAdmin(resetKey: string, newPassword?: string) {
        const expectedKey = process.env.PLATFORM_RESET_KEY;
        if (!expectedKey || resetKey !== expectedKey) {
            throw new UnauthorizedException('Invalid reset key');
        }

        const defaultTenant = await this.prisma.tenantBranding.findFirst({
            where: { isActive: true, isDefault: true },
        });
        if (!defaultTenant) {
            throw new BadRequestException('Default tenant not found');
        }

        const admins = await this.prisma.user.findMany({
            where: { tenantId: defaultTenant.id, role: 'ADMIN' },
            select: { id: true, username: true, name: true, role: true },
        });

        if (!newPassword) {
            // Just return the list of admin usernames — no password change
            return { tenantName: defaultTenant.companyName, admins };
        }

        const validation = PasswordValidator.validate(newPassword);
        if (!validation.isValid) {
            throw new BadRequestException({ message: 'Password too weak', errors: validation.errors });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.updateMany({
            where: { tenantId: defaultTenant.id, role: 'ADMIN' },
            data: { password: hashed },
        });

        return {
            message: 'Password reset for all platform admins',
            admins: admins.map(a => a.username),
        };
    }

    async bootstrapAdmin(data: any, host?: string) {
        const tenant = await this.tenantBrandingService.resolveTenant(host);
        if (!tenant) {
            throw new BadRequestException('Unknown tenant');
        }

        const existingUsers = await this.prisma.user.count({
            where: { tenantId: tenant.id },
        });

        if (existingUsers > 0) {
            throw new ConflictException('Tenant has already been initialized');
        }

        const validation = PasswordValidator.validate(data.password);
        if (!validation.isValid) {
            throw new BadRequestException({
                message: 'Password does not meet requirements',
                errors: validation.errors,
            });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword,
                name: data.name,
                role: Role.ADMIN,
                tenantId: tenant.id,
                canGenerateInvoice: true,
            },
        });

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                canGenerateInvoice: user.canGenerateInvoice,
                tenantId: user.tenantId,
            },
        };
    }
}
