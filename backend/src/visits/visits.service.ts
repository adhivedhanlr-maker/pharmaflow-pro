import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';

const CHECK_IN_RADIUS_METERS = 100;

@Injectable()
export class VisitsService {
    constructor(private prisma: PrismaService) { }

    async checkIn(userId: string, tenantId: string | undefined, dto: CheckInDto) {
        return this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findFirst({
                where: {
                    id: dto.customerId,
                    ...(tenantId ? { tenantId } : {}),
                },
                select: {
                    latitude: true,
                    longitude: true,
                },
            });

            const hasCustomerCoords = customer?.latitude != null && customer?.longitude != null;
            const distance = hasCustomerCoords
                ? Math.round(
                    this.calculateDistance(
                        dto.latitude,
                        dto.longitude,
                        Number(customer.latitude),
                        Number(customer.longitude),
                    ),
                )
                : null;
            const status = distance !== null && distance <= CHECK_IN_RADIUS_METERS ? 'VERIFIED' : 'MISMATCH';

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
                    tenantId,
                    customerId: dto.customerId,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    distance: distance ?? dto.distance ?? null,
                    status,
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

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const radius = 6371e3;
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2)
            + Math.cos(phi1) * Math.cos(phi2)
            * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return radius * c;
    }

    async getReports(tenantId?: string) {
        return this.prisma.visit.findMany({
            where: tenantId ? { tenantId } : undefined,
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

    async getRepVisits(repId: string, tenantId?: string) {
        return this.prisma.visit.findMany({
            where: { repId, ...(tenantId ? { tenantId } : {}) },
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

    async syncLocation(userId: string, tenantId: string | undefined, lat: number, lng: number) {
        // Log the location in history
        await this.prisma.locationLog.create({
            data: {
                userId,
                tenantId,
                latitude: lat,
                longitude: lng,
            }
        });

        // Update current location (existing logic)
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

    async getActiveRepLocations(tenantId?: string) {
        return this.prisma.user.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
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

    async getRoute(repId: string, tenantId: string | undefined, date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.prisma.visit.findMany({
            where: {
                repId: repId,
                ...(tenantId ? { tenantId } : {}),
                checkInTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                checkInTime: 'asc',
            },
            include: {
                customer: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
            },
        });
    }

    async getRoutePath(repId: string, tenantId: string | undefined, date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.prisma.locationLog.findMany({
            where: {
                userId: repId,
                ...(tenantId ? { tenantId } : {}),
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
        });
    }
}
