import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SalesGateway } from '../sales/sales.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private salesGateway: SalesGateway,
        private notifications: NotificationsService
    ) { }

    async findAll() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                canGenerateInvoice: true,
                isOnDuty: true,
                createdAt: true,
                paymentMethod: true,
                monthlySalary: true,
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
                canGenerateInvoice: true,
                isOnDuty: true,
                hourlyRate: true,
                overtimeRate: true,
                paymentMethod: true,
                monthlySalary: true,
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
                canGenerateInvoice: true,
            },
        });
    }

    async update(id: string, data: any) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        if (data.isOnDuty !== undefined) {
            if (data.isOnDuty === true) {
                // Determine start of day for check
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                // Create new attendance record
                await this.prisma.attendance.create({
                    data: {
                        userId: id,
                        startTime: new Date(),
                    }
                });

                // Email Notification
                const user = await this.prisma.user.findUnique({ where: { id } });
                if (user) {
                    this.notifications.notifyAdminOfDutyStart(user.name, new Date());
                }
            } else {
                // User going off duty - Close the last open session
                const lastSession = await this.prisma.attendance.findFirst({
                    where: {
                        userId: id,
                        endTime: null
                    },
                    orderBy: { startTime: 'desc' }
                });

                if (lastSession) {
                    const endTime = new Date();
                    const duration = (endTime.getTime() - new Date(lastSession.startTime).getTime()) / (1000 * 60); // minutes

                    await this.prisma.attendance.update({
                        where: { id: lastSession.id },
                        data: {
                            endTime,
                            duration
                        }
                    });
                }
            }
            // Notify admin of update
            this.salesGateway.notifyAttendanceUpdate({ userId: id, isOnDuty: data.isOnDuty });
        }

        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                canGenerateInvoice: true,
                isOnDuty: true,
                hourlyRate: true,
                overtimeRate: true,
                paymentMethod: true,
                monthlySalary: true,
            },
        });
    }

    async getAttendance() {
        return this.prisma.attendance.findMany({
            orderBy: { startTime: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        role: true,
                        hourlyRate: true,
                        overtimeRate: true,
                        paymentMethod: true,
                        monthlySalary: true

                    }
                }
            }
        });
    }

    async getUserAttendance(userId: string) {
        return this.prisma.attendance.findMany({
            where: { userId },
            orderBy: { startTime: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        role: true,
                        hourlyRate: true,
                        overtimeRate: true,
                        paymentMethod: true,
                        monthlySalary: true

                    }
                }
            }
        });
    }

    async remove(id: string) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}
