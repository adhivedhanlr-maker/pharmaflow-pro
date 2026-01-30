import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartiesService {
    constructor(private prisma: PrismaService) { }

    // Customer Methods
    async findAllCustomers() {
        return this.prisma.customer.findMany({
            orderBy: { name: 'asc' },
        });
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
    async findAllSuppliers() {
        return this.prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
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
