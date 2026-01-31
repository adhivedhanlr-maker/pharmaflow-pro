import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SalesGateway } from '../sales/sales.gateway';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private salesGateway: SalesGateway
    ) { }

    async create(userId: string, dto: CreateOrderDto) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Generate Order Number
            const count = await tx.order.count();
            const orderNumber = `ORD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

            // 2. Prepare Items and Check Stock
            const itemsWithBackorder = await Promise.all(
                dto.items.map(async (item) => {
                    // Check aggregate stock across all batches for this product
                    const totalStock = await tx.batch.aggregate({
                        _sum: {
                            currentStock: true
                        },
                        where: {
                            productId: item.productId
                        }
                    });

                    const isBackorder = (totalStock._sum.currentStock || 0) < item.quantity;

                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        isBackorder
                    };
                })
            );

            // 3. Create Order
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    customerId: dto.customerId,
                    repId: userId,
                    totalAmount: dto.totalAmount,
                    items: {
                        create: itemsWithBackorder
                    }
                },
                include: {
                    customer: true,
                    rep: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            // 4. Notify Admin instantly via WebSocket
            this.salesGateway.server.emit('new-requirement', {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customer.name,
                repName: order.rep.name,
                totalAmount: order.totalAmount,
                hasBackorder: itemsWithBackorder.some(i => i.isBackorder),
                createdAt: order.createdAt
            });

            return order;
        });
    }

    async findAll() {
        return this.prisma.order.findMany({
            include: {
                customer: true,
                rep: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                rep: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    async updateStatus(id: string, status: any) {
        return this.prisma.order.update({
            where: { id },
            data: { status }
        });
    }
}
