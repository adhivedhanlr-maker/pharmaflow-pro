import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';

@Injectable()
export class VisitsService {
    constructor(private prisma: PrismaService) { }

    async checkIn(userId: string, dto: CheckInDto) {
        return this.prisma.$transaction(async (tx) => {
            // Update rep's last known location
            await tx.user.update({
                where: { id: userId },
                data: {
                    lastLat: dto.latitude,
                    lastLng: dto.longitude
                }
            });

            return tx.visit.create({
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

    async syncLocation(userId: string, lat: number, lng: number) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                lastLat: lat,
                lastLng: lng,
            },
            select: {
                id: true,
                name: true,
                lastLat: true,
                lastLng: true,
                updatedAt: true,
            }
        });
    }

    async getActiveRepLocations() {
        return this.prisma.user.findMany({
            where: {
                role: 'SALES_REP',
                NOT: {
                    lastLat: null,
                },
            },
            select: {
                id: true,
                name: true,
                username: true,
                lastLat: true,
                lastLng: true,
                updatedAt: true,
            },
        });
    }
}
