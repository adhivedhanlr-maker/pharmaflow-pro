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
    }, tenantId?: string) {
        const { skip = 0, take = 100, search } = params || {};

        const where = {
            ...(tenantId ? { tenantId } : {}),
            ...(search
                ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { gstin: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }
                : {}),
        };

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

    async findCustomerById(id: string, tenantId?: string) {
        const customer = await this.prisma.customer.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async createCustomer(data: any, tenantId?: string) {
        try {
            return await this.prisma.customer.create({ data: { ...data, tenantId } });
        } catch (error) {
            console.error('Error creating customer:', error);
            throw error;
        }
    }

    async updateCustomer(id: string, data: any, tenantId?: string) {
        const customer = await this.findCustomerById(id, tenantId);
        return this.prisma.customer.update({ where: { id: customer.id }, data });
    }

    // Supplier Methods
    async findAllSuppliers(params?: {
        skip?: number;
        take?: number;
        search?: string;
    }, tenantId?: string) {
        const { skip = 0, take = 100, search } = params || {};

        const where = {
            ...(tenantId ? { tenantId } : {}),
            ...(search
                ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { gstin: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }
                : {}),
        };

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

    async findSupplierById(id: string, tenantId?: string) {
        const supplier = await this.prisma.supplier.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
        if (!supplier) throw new NotFoundException('Supplier not found');
        return supplier;
    }

    async createSupplier(data: any, tenantId?: string) {
        try {
            // Ensure latitude and longitude are numbers or null, never NaN
            if (data.latitude && isNaN(data.latitude)) data.latitude = null;
            if (data.longitude && isNaN(data.longitude)) data.longitude = null;
            
            return await this.prisma.supplier.create({ 
                data: { ...data, tenantId } 
            });
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    }

    async updateSupplier(id: string, data: any, tenantId?: string) {
        const supplier = await this.findSupplierById(id, tenantId);
        return this.prisma.supplier.update({ where: { id: supplier.id }, data });
    }

    async deleteCustomer(id: string, tenantId?: string) {
        // Check if customer has any sales
        const customer = await this.findCustomerById(id, tenantId);
        const salesCount = await this.prisma.sale.count({ where: { customerId: customer.id, ...(tenantId ? { tenantId } : {}) } });
        if (salesCount > 0) {
            throw new Error('Cannot delete customer with existing sales transactions');
        }
        return this.prisma.customer.delete({ where: { id: customer.id } });
    }

    async deleteSupplier(id: string, tenantId?: string) {
        // Check if supplier has any purchases
        const supplier = await this.findSupplierById(id, tenantId);
        const purchasesCount = await this.prisma.purchase.count({ where: { supplierId: supplier.id, ...(tenantId ? { tenantId } : {}) } });
        if (purchasesCount > 0) {
            throw new Error('Cannot delete supplier with existing purchase transactions');
        }
        return this.prisma.supplier.delete({ where: { id: supplier.id } });
    }

    // Search/Autocomplete for Billing
    async searchCustomers(query: string, tenantId?: string) {
        return this.prisma.customer.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
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
