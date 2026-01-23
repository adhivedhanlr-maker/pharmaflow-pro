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
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
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
            },
        });
    }

    async remove(id: string) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}
