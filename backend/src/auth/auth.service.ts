import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PasswordValidator } from './password-validator';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(data: any) {
        // Validate password strength
        const validation = PasswordValidator.validate(data.password);
        if (!validation.isValid) {
            throw new BadRequestException({
                message: 'Password does not meet requirements',
                errors: validation.errors
            });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        try {
            const user = await this.prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
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

    async login(username: string, pass: string) {
        const user = await this.prisma.user.findUnique({
            where: { username },
        });

        if (!user || !(await bcrypt.compare(pass, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id, username: user.username, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        };
    }
}
