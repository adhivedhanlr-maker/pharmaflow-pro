import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ExportService {
    constructor(private prisma: PrismaService) {}

    private makeWorkbook(sheets: { name: string; data: any[] }[]): Buffer {
        const wb = XLSX.utils.book_new();
        for (const sheet of sheets) {
            const ws = XLSX.utils.json_to_sheet(sheet.data.length ? sheet.data : [{}]);
            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        }
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    async exportCustomers(tenantId: string): Promise<Buffer> {
        const rows = await this.prisma.customer.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
        const data = rows.map(r => ({
            Name: r.name,
            Phone: r.phone || '',
            Landline: r.landPhone || '',
            GSTIN: r.gstin || '',
            Address: r.address || '',
            'Drug License No': r.dlNo || '',
            'FSSAI No': r.fssaiNo || '',
            'Credit Limit': r.creditLimit,
            'Current Balance': r.currentBalance,
        }));
        return this.makeWorkbook([{ name: 'Customers', data }]);
    }

    async exportSuppliers(tenantId: string): Promise<Buffer> {
        const rows = await this.prisma.supplier.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
        const data = rows.map(r => ({
            Name: r.name,
            Phone: r.phone || '',
            Landline: r.landPhone || '',
            GSTIN: r.gstin || '',
            Address: r.address || '',
            'Current Balance': r.currentBalance,
        }));
        return this.makeWorkbook([{ name: 'Suppliers', data }]);
    }

    async exportStock(tenantId: string): Promise<Buffer> {
        const rows = await this.prisma.batch.findMany({
            where: { tenantId, currentStock: { gt: 0 } },
            include: { product: true, supplier: true },
            orderBy: [{ product: { name: 'asc' } }, { expiryDate: 'asc' }],
        });
        const data = rows.map(r => ({
            Product: r.product.name,
            Company: r.product.company || '',
            Packing: r.product.packing || '',
            'HSN Code': r.product.hsnCode || '',
            'GST %': r.product.gstRate,
            'Batch No': r.batchNumber,
            'Expiry Date': r.expiryDate ? r.expiryDate.toISOString().slice(0, 7) : '',
            'Current Stock': r.currentStock,
            MRP: r.mrp,
            PTR: r.ptr || '',
            PTS: r.pts || '',
            'Purchase Price': r.purchasePrice,
            Supplier: r.supplier?.name || '',
        }));
        return this.makeWorkbook([{ name: 'Stock', data }]);
    }

    async exportInvoices(tenantId: string, from?: string, to?: string): Promise<Buffer> {
        const where: any = { tenantId };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }
        const sales = await this.prisma.sale.findMany({
            where,
            include: {
                customer: true,
                items: { include: { product: true, batch: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const invoiceRows: any[] = [];
        const itemRows: any[] = [];

        for (const sale of sales) {
            invoiceRows.push({
                'Invoice No': sale.invoiceNumber,
                Date: sale.createdAt.toISOString().slice(0, 10),
                Customer: sale.customer?.name || '',
                GSTIN: sale.customer?.gstin || '',
                'Payment Method': sale.paymentMethod,
                'Customer Type': sale.customerType || '',
                'Subtotal (₹)': sale.totalAmount,
                'GST (₹)': sale.gstAmount,
                'Discount (₹)': sale.discountAmount,
                'Net Amount (₹)': sale.netAmount,
            });
            for (const item of sale.items) {
                itemRows.push({
                    'Invoice No': sale.invoiceNumber,
                    Date: sale.createdAt.toISOString().slice(0, 10),
                    Product: item.product?.name || '',
                    'Batch No': item.batch?.batchNumber || '',
                    Qty: item.quantity,
                    'Free Qty': item.freeQuantity || 0,
                    'Unit Price': item.unitPrice,
                    'GST %': item.gstRate,
                    'GST (₹)': item.gstAmount,
                    'Total (₹)': item.totalAmount,
                });
            }
        }

        return this.makeWorkbook([
            { name: 'Invoices', data: invoiceRows },
            { name: 'Invoice Items', data: itemRows },
        ]);
    }

    async exportPurchases(tenantId: string, from?: string, to?: string): Promise<Buffer> {
        const where: any = { tenantId };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }
        const purchases = await this.prisma.purchase.findMany({
            where,
            include: {
                supplier: true,
                items: { include: { product: true, batch: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const purchaseRows: any[] = [];
        const itemRows: any[] = [];

        for (const p of purchases) {
            purchaseRows.push({
                'Bill No': p.billNumber,
                Date: p.createdAt.toISOString().slice(0, 10),
                Supplier: p.supplier?.name || '',
                'Supplier GSTIN': p.supplier?.gstin || '',
                'Total (₹)': p.totalAmount,
                'GST (₹)': p.gstAmount,
                'Net (₹)': p.netAmount,
            });
            for (const item of p.items) {
                itemRows.push({
                    'Bill No': p.billNumber,
                    Date: p.createdAt.toISOString().slice(0, 10),
                    Product: item.product?.name || '',
                    'Batch No': item.batch?.batchNumber || '',
                    Qty: item.quantity,
                    'Free Qty': item.freeQty || 0,
                    'Purchase Price': item.purchasePrice,
                    'GST %': item.gstRate,
                    'GST (₹)': item.gstAmount,
                    'Total (₹)': item.totalAmount,
                });
            }
        }

        return this.makeWorkbook([
            { name: 'Purchases', data: purchaseRows },
            { name: 'Purchase Items', data: itemRows },
        ]);
    }

    async exportAll(tenantId: string): Promise<Buffer> {
        const [customers, suppliers, batches, sales, purchases] = await Promise.all([
            this.prisma.customer.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
            this.prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
            this.prisma.batch.findMany({ where: { tenantId, currentStock: { gt: 0 } }, include: { product: true, supplier: true }, orderBy: [{ product: { name: 'asc' } }] }),
            this.prisma.sale.findMany({ where: { tenantId }, include: { customer: true }, orderBy: { createdAt: 'desc' } }),
            this.prisma.purchase.findMany({ where: { tenantId }, include: { supplier: true }, orderBy: { createdAt: 'desc' } }),
        ]);

        return this.makeWorkbook([
            {
                name: 'Customers',
                data: customers.map(r => ({ Name: r.name, Phone: r.phone || '', GSTIN: r.gstin || '', Address: r.address || '', 'Drug License': r.dlNo || '', Balance: r.currentBalance })),
            },
            {
                name: 'Suppliers',
                data: suppliers.map(r => ({ Name: r.name, Phone: r.phone || '', GSTIN: r.gstin || '', Address: r.address || '', Balance: r.currentBalance })),
            },
            {
                name: 'Stock',
                data: batches.map(r => ({ Product: r.product.name, Company: r.product.company || '', Batch: r.batchNumber, Expiry: r.expiryDate?.toISOString().slice(0, 7) || '', Stock: r.currentStock, MRP: r.mrp, PTR: r.ptr || '', 'Purchase Price': r.purchasePrice })),
            },
            {
                name: 'Invoices',
                data: sales.map(s => ({ 'Invoice No': s.invoiceNumber, Date: s.createdAt.toISOString().slice(0, 10), Customer: s.customer?.name || '', Payment: s.paymentMethod, 'Net Amount': s.netAmount })),
            },
            {
                name: 'Purchases',
                data: purchases.map(p => ({ 'Bill No': p.billNumber, Date: p.createdAt.toISOString().slice(0, 10), Supplier: p.supplier?.name || '', 'Net Amount': p.netAmount })),
            },
        ]);
    }

    // ── Import templates ────────────────────────────────────────────────────

    getCustomerTemplate(): Buffer {
        const data = [{ Name: 'Example Pharmacy', Phone: '9876543210', Landline: '', GSTIN: '27ABCDE1234F1Z5', Address: 'City', 'Drug License No': '', 'FSSAI No': '', 'Credit Limit': 0 }];
        return this.makeWorkbook([{ name: 'Customers', data }]);
    }

    getSupplierTemplate(): Buffer {
        const data = [{ Name: 'Example Supplier Pvt Ltd', Phone: '9876543210', Landline: '', GSTIN: '27ABCDE1234F1Z5', Address: 'City' }];
        return this.makeWorkbook([{ name: 'Suppliers', data }]);
    }

    getProductTemplate(): Buffer {
        const data = [{ 'Product Name': 'Paracetamol 500mg', Company: 'ABC Pharma', Packing: '10x10', 'HSN Code': '30049099', 'GST %': 12, 'Batch No': 'BT001', 'Expiry (MM/YYYY)': '12/2026', 'Opening Stock': 100, MRP: 25.50, PTR: 22.00, PTS: 20.00, 'Purchase Price': 18.00 }];
        return this.makeWorkbook([{ name: 'Products', data }]);
    }

    // ── Import ──────────────────────────────────────────────────────────────

    async importCustomers(tenantId: string, buffer: Buffer): Promise<{ created: number; skipped: number; errors: string[] }> {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        let created = 0, skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            const name = (row['Name'] || '').toString().trim();
            if (!name) { skipped++; continue; }
            try {
                await this.prisma.customer.create({
                    data: {
                        tenantId,
                        name,
                        phone: (row['Phone'] || '').toString().trim() || null,
                        landPhone: (row['Landline'] || '').toString().trim() || null,
                        gstin: (row['GSTIN'] || '').toString().trim().toUpperCase() || null,
                        address: (row['Address'] || '').toString().trim() || null,
                        dlNo: (row['Drug License No'] || '').toString().trim() || null,
                        fssaiNo: (row['FSSAI No'] || '').toString().trim() || null,
                        creditLimit: parseFloat(row['Credit Limit'] || '0') || 0,
                    },
                });
                created++;
            } catch (e: any) {
                errors.push(`Row "${name}": ${e.message}`);
                skipped++;
            }
        }
        return { created, skipped, errors };
    }

    async importSuppliers(tenantId: string, buffer: Buffer): Promise<{ created: number; skipped: number; errors: string[] }> {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        let created = 0, skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            const name = (row['Name'] || '').toString().trim();
            if (!name) { skipped++; continue; }
            try {
                await this.prisma.supplier.create({
                    data: {
                        tenantId,
                        name,
                        phone: (row['Phone'] || '').toString().trim() || null,
                        landPhone: (row['Landline'] || '').toString().trim() || null,
                        gstin: (row['GSTIN'] || '').toString().trim().toUpperCase() || null,
                        address: (row['Address'] || '').toString().trim() || null,
                    },
                });
                created++;
            } catch (e: any) {
                errors.push(`Row "${name}": ${e.message}`);
                skipped++;
            }
        }
        return { created, skipped, errors };
    }

    async importProducts(tenantId: string, buffer: Buffer): Promise<{ created: number; skipped: number; errors: string[] }> {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        let created = 0, skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            const name = (row['Product Name'] || '').toString().trim();
            if (!name) { skipped++; continue; }
            try {
                const expiryRaw = (row['Expiry (MM/YYYY)'] || '').toString().trim();
                let expiryDate = new Date('2099-12-31');
                if (expiryRaw) {
                    const [mm, yyyy] = expiryRaw.split('/');
                    if (mm && yyyy) expiryDate = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
                }

                const product = await this.prisma.product.upsert({
                    where: { name_tenantId: { name, tenantId } },
                    create: {
                        tenantId,
                        name,
                        company: (row['Company'] || '').toString().trim() || null,
                        packing: (row['Packing'] || '').toString().trim() || null,
                        hsnCode: (row['HSN Code'] || '').toString().trim() || null,
                        gstRate: parseFloat(row['GST %'] || '0') || 0,
                        mrp: parseInt(row['MRP'] || '0') || 0,
                    },
                    update: {},
                });

                const batchNo = (row['Batch No'] || 'OPENING').toString().trim();
                const stock = parseInt(row['Opening Stock'] || '0') || 0;

                await this.prisma.batch.create({
                    data: {
                        tenantId,
                        productId: product.id,
                        batchNumber: batchNo,
                        expiryDate,
                        currentStock: stock,
                        mrp: parseFloat(row['MRP'] || '0') || 0,
                        purchasePrice: parseFloat(row['Purchase Price'] || '0') || 0,
                        salePrice: parseFloat(row['PTR'] || row['MRP'] || '0') || 0,
                        ptr: parseFloat(row['PTR'] || '0') || null,
                        pts: parseFloat(row['PTS'] || '0') || null,
                    },
                });
                created++;
            } catch (e: any) {
                errors.push(`Row "${name}": ${e.message}`);
                skipped++;
            }
        }
        return { created, skipped, errors };
    }
}
