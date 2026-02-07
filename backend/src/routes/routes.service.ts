import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouteStatus, StopStatus } from '@prisma/client';

@Injectable()
export class RoutesService {
    constructor(private prisma: PrismaService) { }

    async create(data: { repId: string; date: string; stops: string[] }) {
        // Check if route already exists for this rep and date
        const date = new Date(data.date);

        // Validate date (must be start of day for consistency)
        // date.setHours(0,0,0,0); 

        const existing = await this.prisma.route.findFirst({
            where: {
                repId: data.repId,
                date: date
            }
        });

        if (existing) {
            throw new BadRequestException('Route already exists for this rep on this date');
        }

        return this.prisma.route.create({
            data: {
                repId: data.repId,
                date: date,
                status: RouteStatus.DRAFT,
                stops: {
                    create: data.stops.map((customerId, index) => ({
                        customerId,
                        stopOrder: index + 1,
                        status: StopStatus.PENDING
                    }))
                }
            },
            include: {
                stops: {
                    include: { customer: true }
                }
            }
        });
    }

    async findAll(repId?: string, dateStr?: string) {
        const where: any = {};
        if (repId) where.repId = repId;
        if (dateStr) {
            // Simple date filtering - might need range if timezones match poorly
            // asking for exact match on date field
            where.date = new Date(dateStr);
        }

        return this.prisma.route.findMany({
            where,
            include: {
                rep: { select: { name: true } },
                stops: {
                    include: { customer: true },
                    orderBy: { stopOrder: 'asc' }
                }
            },
            orderBy: { date: 'desc' }
        });
    }

    async findOne(id: string) {
        const route = await this.prisma.route.findUnique({
            where: { id },
            include: {
                rep: { select: { name: true } },
                stops: {
                    include: { customer: true },
                    orderBy: { stopOrder: 'asc' }
                }
            }
        });
        if (!route) throw new NotFoundException('Route not found');
        return route;
    }

    async updateStopStatus(routeId: string, stopId: string, status: StopStatus, notes?: string) {
        return this.prisma.routeStop.update({
            where: { id: stopId },
            data: { status, notes, visitedAt: status === 'COMPLETED' ? new Date() : null }
        });
    }
}
