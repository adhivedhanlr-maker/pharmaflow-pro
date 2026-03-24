import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartiesService {
    constructor(private prisma: PrismaService) { }

    private normalizeCoordinate(value: unknown) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

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
            const { name, gstin, phone, address, latitude, longitude, creditLimit } = data;
            return await this.prisma.customer.create({ 
                data: { 
                    name, 
                    gstin, 
                    phone, 
                    address, 
                    latitude: this.normalizeCoordinate(latitude), 
                    longitude: this.normalizeCoordinate(longitude), 
                    creditLimit: creditLimit || 0,
                    tenantId 
                } 
            });
        } catch (error) {
            console.error('Error creating customer:', error);
            throw new BadRequestException(`Failed to create customer: ${error.message}`);
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
            const { name, gstin, phone, address } = data;

            return await this.prisma.supplier.create({ 
                data: { 
                    name, 
                    gstin, 
                    phone, 
                    address, 
                    tenantId 
                } 
            });
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw new BadRequestException(`Failed to create supplier: ${error.message}`);
        }
    }

    async updateSupplier(id: string, data: any, tenantId?: string) {
        const supplier = await this.findSupplierById(id, tenantId);
        return this.prisma.supplier.update({ where: { id: supplier.id }, data });
    }

    async deleteCustomer(id: string, tenantId?: string) {
        const customer = await this.findCustomerById(id, tenantId);
        
        // 1. Check Balance
        if (Math.abs(customer.currentBalance) > 0.01) {
            throw new BadRequestException(`Cannot delete customer with outstanding balance (₹${customer.currentBalance.toLocaleString()}). Please clear the balance first.`);
        }

        // 2. Check Sales
        const salesCount = await this.prisma.sale.count({ where: { customerId: customer.id, ...(tenantId ? { tenantId } : {}) } });
        if (salesCount > 0) {
            throw new BadRequestException('Cannot delete customer with existing sales transactions.');
        }

        // 3. Check Visits
        const visitsCount = await this.prisma.visit.count({ where: { customerId: customer.id, ...(tenantId ? { tenantId } : {}) } });
        if (visitsCount > 0) {
            throw new BadRequestException('Cannot delete customer with recorded visits.');
        }

        // 4. Check Orders
        const ordersCount = await this.prisma.order.count({ where: { customerId: customer.id, ...(tenantId ? { tenantId } : {}) } });
        if (ordersCount > 0) {
            throw new BadRequestException('Cannot delete customer with existing orders.');
        }

        return this.prisma.customer.delete({ where: { id: customer.id } });
    }

    async resetSupplierBalance(id: string, tenantId?: string) {
        const supplier = await this.findSupplierById(id, tenantId);
        return this.prisma.supplier.update({
            where: { id: supplier.id },
            data: { currentBalance: 0 },
        });
    }

    async resetCustomerBalance(id: string, tenantId?: string) {
        const customer = await this.findCustomerById(id, tenantId);
        return this.prisma.customer.update({
            where: { id: customer.id },
            data: { currentBalance: 0 },
        });
    }

    async deleteSupplier(id: string, tenantId?: string) {
        const supplier = await this.findSupplierById(id, tenantId);

        // 1. Check Balance
        if (Math.abs(supplier.currentBalance) > 0.01) {
            throw new BadRequestException(`Cannot delete supplier with outstanding balance (₹${supplier.currentBalance.toLocaleString()}). Please clear the balance first.`);
        }

        // 2. Check Purchases
        const purchasesCount = await this.prisma.purchase.count({ where: { supplierId: supplier.id, ...(tenantId ? { tenantId } : {}) } });
        if (purchasesCount > 0) {
            throw new BadRequestException('Cannot delete supplier with existing purchase transactions.');
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
