import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isOnDuty: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isOnDuty: true,
                createdAt: true,
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async create(data: any) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
            },
        });
    }

    async update(id: string, data: any) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isOnDuty: true,
            },
        });
    }

    async remove(id: string) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}
