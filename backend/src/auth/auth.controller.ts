import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TwoFactorService } from './two-factor.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private twoFactorService: TwoFactorService
    ) { }

    @Post('register')
    register(@Body() registerDto: any) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: any) {
        return this.authService.login(loginDto.username, loginDto.password);
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
