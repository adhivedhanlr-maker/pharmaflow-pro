import { Controller, Post, Delete, Get, Body, Request, UseGuards } from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('auth/webauthn')
export class WebAuthnController {
    constructor(private readonly webAuthnService: WebAuthnService) { }

    // ── Protected: requires JWT ──────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Post('register-challenge')
    getRegistrationChallenge(@Body() body: { host: string }, @Request() req: any) {
        return this.webAuthnService.getRegistrationOptions(req.user.userId, req.user.username, body.host);
    }

    @UseGuards(JwtAuthGuard)
    @Post('register')
    register(@Body() body: { credential: any; host: string; deviceName?: string }, @Request() req: any) {
        return this.webAuthnService.verifyRegistration(
            req.user.userId,
            req.user.tenantId,
            body.credential,
            body.host,
            body.deviceName,
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
    getAuthenticationChallenge(@Body() body: { username: string; host: string }) {
        return this.webAuthnService.getAuthenticationOptions(body.username, body.host);
    }

    @Post('verify')
    verifyAuthentication(@Body() body: { userId: string; credential: any; host: string }) {
        return this.webAuthnService.verifyAuthentication(body.userId, body.credential, body.host);
    }
}
