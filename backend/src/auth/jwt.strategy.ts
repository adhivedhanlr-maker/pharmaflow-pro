import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'secretKey',
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        // Extract token from header
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        // Handle test mode tokens (development only)
        if (token && token.startsWith('test_')) {
            if (process.env.NODE_ENV === 'production') {
                throw new UnauthorizedException('Test tokens not allowed in production');
            }

            try {
                // Decode test token (format: test_<base64_encoded_user>)
                const encodedUser = token.substring(5); // Remove 'test_' prefix
                const testUser = JSON.parse(Buffer.from(encodedUser, 'base64').toString());

                return {
                    userId: testUser.id,
                    username: testUser.username,
                    role: testUser.role
                };
            } catch (error) {
                throw new UnauthorizedException('Invalid test token');
            }
        }

        // Normal JWT validation
        return { userId: payload.sub, username: payload.username, role: payload.role };
    }
}
