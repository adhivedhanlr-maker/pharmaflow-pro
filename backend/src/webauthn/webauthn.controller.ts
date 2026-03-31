import { Controller, Post, Delete, Get, Body, Request, UseGuards } from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('auth/webauthn')
export class WebAuthnController {
    constructor(private readonly webAuthnService: WebAuthnService) { }

    // ── Protected: requires JWT ──────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('register-challenge')
    getRegistrationChallenge(@Request() req: any) {
        const host = req.headers.host as string;
        return this.webAuthnService.getRegistrationOptions(req.user.userId, req.user.username, host);
    }

    @UseGuards(JwtAuthGuard)
    @Post('register')
    register(@Body() body: any, @Request() req: any) {
        const { credential, deviceName } = body;
        const host = req.headers.host as string;
        return this.webAuthnService.verifyRegistration(
            req.user.userId,
            req.user.tenantId,
            credential,
            host,
            deviceName,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('status')
    async getStatus(@Request() req: any) {
        const enabled = await this.webAuthnService.hasCredential(req.user.userId);
        return { enabled };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('credential')
    removeCredential(@Request() req: any) {
        return this.webAuthnService.removeCredential(req.user.userId);
    }

    // ── Public: user is not logged in yet ────────────────────────────

    @Post('auth-challenge')
    getAuthenticationChallenge(@Body() body: { username: string }, @Request() req: any) {
        const host = req.headers.host as string;
        return this.webAuthnService.getAuthenticationOptions(body.username, host);
    }

    @Post('verify')
    verifyAuthentication(@Body() body: { userId: string; credential: any }, @Request() req: any) {
        const host = req.headers.host as string;
        return this.webAuthnService.verifyAuthentication(body.userId, body.credential, host);
    }
}
