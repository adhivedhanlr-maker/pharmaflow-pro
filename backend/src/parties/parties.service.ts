import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartiesService {
    constructor(private prisma: PrismaService) { }

    // Customer Methods
    async findAllCustomers(params?: {
        skip?: number;
        take?: number;
        search?: string;
    }) {
        const { skip = 0, take = 100, search } = params || {};

        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { gstin: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take,
                orderBy: { name: 'asc' },
            }),
            this.prisma.customer.count({ where }),
        ]);

        return {
            data: customers,
            total,
            hasMore: skip + customers.length < total,
        };
    }

    async findCustomerById(id: string) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async createCustomer(data: any) {
        return this.prisma.customer.create({ data });
    }

    async updateCustomer(id: string, data: any) {
        return this.prisma.customer.update({ where: { id }, data });
    }

    // Supplier Methods
    async findAllSuppliers(params?: {
        skip?: number;
        take?: number;
        search?: string;
    }) {
        const { skip = 0, take = 100, search } = params || {};

        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { gstin: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [suppliers, total] = await Promise.all([
            this.prisma.supplier.findMany({
                where,
                skip,
                take,
                orderBy: { name: 'asc' },
            }),
            this.prisma.supplier.count({ where }),
        ]);

        return {
            data: suppliers,
            total,
            hasMore: skip + suppliers.length < total,
        };
    }

    async findSupplierById(id: string) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id } });
        if (!supplier) throw new NotFoundException('Supplier not found');
        return supplier;
    }

    async createSupplier(data: any) {
        return this.prisma.supplier.create({ data });
    }

    async updateSupplier(id: string, data: any) {
        return this.prisma.supplier.update({ where: { id }, data });
    }

    async deleteCustomer(id: string) {
        // Check if customer has any sales
        const salesCount = await this.prisma.sale.count({ where: { customerId: id } });
        if (salesCount > 0) {
            throw new Error('Cannot delete customer with existing sales transactions');
        }
        return this.prisma.customer.delete({ where: { id } });
    }

    async deleteSupplier(id: string) {
        // Check if supplier has any purchases
        const purchasesCount = await this.prisma.purchase.count({ where: { supplierId: id } });
        if (purchasesCount > 0) {
            throw new Error('Cannot delete supplier with existing purchase transactions');
        }
        return this.prisma.supplier.delete({ where: { id } });
    }

    // Search/Autocomplete for Billing
    async searchCustomers(query: string) {
        return this.prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { gstin: { contains: query } },
                    { phone: { contains: query } },
                ],
            },
            take: 10,
        });
    }
}
