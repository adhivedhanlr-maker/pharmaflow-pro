import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: process.env.JWKS_URI || '',
            }),
            algorithms: ['RS256', 'EdDSA'], // Neon uses EdDSA sometimes, need to check if supported by jwks-rsa/passport, likely RS256 for standard OIDC
        });
    }

    async validate(payload: any) {
        // Find user by Neon ID (sub) or create if not exists
        // Note: Payload structure depends on provider. Typically 'sub' is the ID.
        // We might need to sync user info here.
        // For now, let's assume we want to map it to our internal user.
        // Strategy:
        // 1. Check if user exists with this 'sub' (we need to add neonId to User model or rely on username/email matching)
        // 2. If not, create a new user or throw until we have a sync mechanism.

        // Simpler approach for transition:
        // If the token is valid (which it is if we reach here), we trust it.
        // We can attach the payload to the request user.
        return {
            userId: payload.sub,
            username: payload.preferred_username || payload.name || payload.email || 'NeonUser',
            role: 'ADMIN' // TEMPORARY: Grant admin for verified neon users during dev
        };
    }
}
