import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';

@Injectable()
export class VisitsService {
    constructor(private prisma: PrismaService) { }

    async checkIn(userId: string, dto: CheckInDto) {
        return this.prisma.visit.create({
            data: {
                repId: userId,
                customerId: dto.customerId,
                latitude: dto.latitude,
                longitude: dto.longitude,
                distance: dto.distance,
                status: dto.status,
            },
            include: {
                customer: true,
                rep: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                    },
                },
            },
        });
    }

    async getReports() {
        return this.prisma.visit.findMany({
            orderBy: {
                checkInTime: 'desc',
            },
            include: {
                customer: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
                rep: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async getRepVisits(repId: string) {
        return this.prisma.visit.findMany({
            where: { repId },
            orderBy: {
                checkInTime: 'desc',
            },
            include: {
                customer: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
}
