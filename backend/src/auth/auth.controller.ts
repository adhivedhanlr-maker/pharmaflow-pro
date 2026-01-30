import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TwoFactorService } from './two-factor.service';
import { AuditLogService, AuditAction } from '../audit/audit-log.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private twoFactorService: TwoFactorService,
        private auditLogService: AuditLogService,
    ) { }

    @Post('register')
    async register(@Body() registerDto: any, @Req() req: any) {
        const user = await this.authService.register(registerDto);
        await this.auditLogService.log({
            userId: user.id,
            action: AuditAction.REGISTER,
            entity: 'User',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return user;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: any, @Req() req: any) {
        const result = await this.authService.login(loginDto.username, loginDto.password);
        if (!result.requires2FA && result.user) {
            await this.auditLogService.log({
                userId: result.user.id,
                action: AuditAction.LOGIN,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }
        return result;
    }

    // 2FA Endpoints
    @Get('2fa/generate')
    @UseGuards(JwtAuthGuard)
    async generate2FA(@Req() req: any) {
        const user = req.user;
        return this.twoFactorService.generateSecret(user.userId, user.username);
    }

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    async enable2FA(@Req() req: any, @Body() body: { secret: string; token: string }) {
        const user = req.user;
        const success = await this.twoFactorService.enable2FA(user.userId, body.secret, body.token);
        if (!success) {
            return { success: false, message: 'Invalid verification code' };
        }
        return { success: true, message: '2FA enabled successfully' };
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    async disable2FA(@Req() req: any) {
        const user = req.user;
        await this.twoFactorService.disable2FA(user.userId);
        return { success: true, message: '2FA disabled successfully' };
    }

    @Post('2fa/verify')
    @HttpCode(HttpStatus.OK)
    async verify2FA(@Body() body: { username: string; token: string }) {
        return this.authService.verify2FAAndLogin(body.username, body.token);
    }
}
