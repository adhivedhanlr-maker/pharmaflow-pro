import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { TenantBrandingService } from '../tenant-branding/tenant-branding.service';

const RP_NAME = 'PharmaFlow Pro';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// host here is always the FRONTEND hostname sent by the browser, never the backend server host
function validateClientHost(host: string): string {
    if (!host) throw new BadRequestException('Host is required');
    if (host.includes('localhost') || host.includes('127.0.0.1')) return host;
    if (!host.endsWith('pharmaflow.eflybe.com')) throw new BadRequestException('Invalid host');
    return host;
}

function getRpId(host: string): string {
    if (host.includes('localhost') || host.includes('127.0.0.1')) return 'localhost';
    return 'pharmaflow.eflybe.com';
}

function getOrigin(host: string): string {
    if (host.includes('localhost') || host.includes('127.0.0.1')) return `http://${host}`;
    return `https://${host}`;
}

@Injectable()
export class WebAuthnService {
    private challenges = new Map<string, { challenge: string; expires: number }>();

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private tenantBrandingService: TenantBrandingService,
    ) { }

    async getRegistrationOptions(userId: string, username: string, host: string) {
        const safeHost = validateClientHost(host);
        const rpID = getRpId(safeHost);

        const existingCreds = await this.prisma.webAuthnCredential.findMany({
            where: { userId },
            select: { credentialId: true },
        });

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID,
            userID: userId,
            userName: username,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'preferred',
            },
            excludeCredentials: existingCreds.map((c: { credentialId: string }) => ({
                id: Buffer.from(c.credentialId, 'base64url'),
                type: 'public-key' as const,
            })),
        });

        this.challenges.set(`reg:${userId}`, {
            challenge: options.challenge,
            expires: Date.now() + CHALLENGE_TTL_MS,
        });

        return options;
    }

    async verifyRegistration(userId: string, tenantId: string | undefined, credential: any, host: string, deviceName?: string) {
        const safeHost = validateClientHost(host);
        const stored = this.challenges.get(`reg:${userId}`);
        if (!stored || stored.expires < Date.now()) {
            this.challenges.delete(`reg:${userId}`);
            throw new BadRequestException('Challenge expired. Please try again.');
        }
        this.challenges.delete(`reg:${userId}`);

        const rpID = getRpId(safeHost);
        const origin = getOrigin(safeHost);

        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge: stored.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
        });

        if (!verification.verified || !verification.registrationInfo) {
            throw new UnauthorizedException('Biometric registration failed');
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        await this.prisma.webAuthnCredential.deleteMany({ where: { userId } });
        await this.prisma.webAuthnCredential.create({
            data: {
                userId,
                tenantId,
                credentialId: Buffer.from(credentialID).toString('base64url'),
                publicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter: BigInt(counter),
                deviceName: deviceName || 'Mobile Device',
            },
        });

        return { verified: true };
    }

    async getAuthenticationOptions(username: string, host: string) {
        const safeHost = validateClientHost(host);
        const tenant = await this.tenantBrandingService.resolveTenant(safeHost);
        const tenantId = tenant?.id;

        const user = await this.prisma.user.findFirst({
            where: { username, ...(tenantId ? { tenantId } : {}) },
            select: { id: true, webAuthnCredentials: true },
        });

        if (!user || !user.webAuthnCredentials.length) {
            throw new NotFoundException('No biometric credentials found for this account');
        }

        const cred = user.webAuthnCredentials[0];
        const rpID = getRpId(safeHost);

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: [{
                id: Buffer.from(cred.credentialId, 'base64url'),
                type: 'public-key',
                transports: ['internal'],
            }],
            userVerification: 'required',
        });

        this.challenges.set(`auth:${user.id}`, {
            challenge: options.challenge,
            expires: Date.now() + CHALLENGE_TTL_MS,
        });

        return { options, userId: user.id };
    }

    async verifyAuthentication(userId: string, credential: any, host: string) {
        const safeHost = validateClientHost(host);
        const stored = this.challenges.get(`auth:${userId}`);
        if (!stored || stored.expires < Date.now()) {
            this.challenges.delete(`auth:${userId}`);
            throw new BadRequestException('Challenge expired. Please try again.');
        }
        this.challenges.delete(`auth:${userId}`);

        const dbCred = await this.prisma.webAuthnCredential.findFirst({ where: { userId } });
        if (!dbCred) throw new NotFoundException('No biometric credential found');

        const rpID = getRpId(safeHost);
        const origin = getOrigin(safeHost);

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: stored.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(dbCred.credentialId, 'base64url'),
                credentialPublicKey: Buffer.from(dbCred.publicKey, 'base64'),
                counter: Number(dbCred.counter),
            },
            requireUserVerification: true,
        });

        if (!verification.verified) {
            throw new UnauthorizedException('Biometric authentication failed');
        }

        await this.prisma.webAuthnCredential.update({
            where: { id: dbCred.id },
            data: { counter: BigInt(verification.authenticationInfo.newCounter) },
        });

        const user = await this.prisma.user.findFirst({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    async removeCredential(userId: string) {
        await this.prisma.webAuthnCredential.deleteMany({ where: { userId } });
        return { message: 'Biometric login disabled' };
    }

    async hasCredential(userId: string): Promise<boolean> {
        const count = await this.prisma.webAuthnCredential.count({ where: { userId } });
        return count > 0;
    }
}
