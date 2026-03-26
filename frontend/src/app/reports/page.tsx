"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    TrendingUp,
    TrendingDown,
    AlertOctagon,
    Loader2,
    FileDown,
    ShieldAlert,
    Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";

interface SaleItem {
    quantity: number;
    freeQuantity?: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    product?: { name: string; hsnCode?: string };
}

interface Sale {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    netAmount: number;
    gstAmount: number;
    totalAmount: number;
    customer?: { name: string; gstin?: string };
    user?: { name: string; role: string };
    items?: SaleItem[];
}

interface PurchaseItem {
    quantity: number;
    freeQty?: number;
    purchasePrice: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    product?: { name: string; hsnCode?: string };
}

interface Purchase {
    id: string;
    billNumber: string;
    createdAt: string;
    netAmount: number;
    gstAmount: number;
    supplier?: { name: string; gstin?: string };
    items?: PurchaseItem[];
}

interface ExpiringBatch {
    id: string;
    batchNumber: string;
    expiryDate: string;
    currentStock: number;
    salePrice: number;
    product: { name: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function downloadCSV(filename: string, rows: (string | number)[][]) {
    const csv = rows.map(r =>
        r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv, ], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

export default function ReportsPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [gstLoading, setGstLoading] = useState(false);

    // Date range — defaults to current month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(firstOfMonth);
    const [endDate, setEndDate] = useState(today);

    useEffect(() => {
        if (token) fetchReports();
    }, [token]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [saleRes, expRes, purRes] = await Promise.all([
                fetch(`${API_BASE}/sales/invoices`, { headers }),
                fetch(`${API_BASE}/inventory/alerts/expiring`, { headers }),
                fetch(`${API_BASE}/purchases`, { headers }),
            ]);
            if (saleRes.ok) setSales(await saleRes.json());
            if (expRes.ok) setExpiring(await expRes.json());
            if (purRes.ok) setPurchases(await purRes.json());
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter by date range
    const filteredSales = useMemo(() =>
        sales.filter(s => {
            const d = s.createdAt.slice(0, 10);
            return d >= startDate && d <= endDate;
        }), [sales, startDate, endDate]);

    const filteredPurchases = useMemo(() =>
        purchases.filter(p => {
            const d = p.createdAt.slice(0, 10);
            return d >= startDate && d <= endDate;
        }), [purchases, startDate, endDate]);

    const stats = {
        totalSales: filteredSales.reduce((a, s) => a + (s.netAmount || 0), 0),
        totalGst: filteredSales.reduce((a, s) => a + (s.gstAmount || 0), 0),
        totalPurchases: filteredPurchases.reduce((a, p) => a + (p.netAmount || 0), 0),
        expiryRisk: expiring.reduce((a, b) => a + (b.currentStock * b.salePrice), 0),
    };

    const handleDownloadGST = () => {
        setGstLoading(true);
        const label = `${startDate}_to_${endDate}`;

        // ── SALES GST CSV ──
        const salesRows: (string | number)[][] = [[
            "Invoice No", "Date", "Customer", "Customer GSTIN",
            "HSN Code", "Product", "Qty", "Free",
            "Rate (PTR/PTS)", "Taxable Value", "GST %",
            "CGST Amt", "SGST Amt", "Total"
        ]];
        for (const sale of filteredSales) {
            const date = new Date(sale.createdAt).toLocaleDateString("en-IN");
            for (const item of (sale.items || [])) {
                const taxable = item.quantity * item.unitPrice;
                const cgst = item.gstAmount / 2;
                const sgst = item.gstAmount / 2;
                salesRows.push([
                    sale.invoiceNumber,
                    date,
                    sale.customer?.name || "",
                    sale.customer?.gstin || "",
                    item.product?.hsnCode || "",
                    item.product?.name || "",
                    item.quantity,
                    item.freeQuantity || 0,
                    item.unitPrice.toFixed(2),
                    taxable.toFixed(2),
                    item.gstRate,
                    cgst.toFixed(2),
                    sgst.toFixed(2),
                    item.totalAmount.toFixed(2),
                ]);
            }
        }
        downloadCSV(`GST_Sales_${label}.csv`, salesRows);

        // ── PURCHASE GST CSV ──
        const purRows: (string | number)[][] = [[
            "Bill No", "Date", "Supplier", "Supplier GSTIN",
            "HSN Code", "Product", "Qty", "Free",
            "Purchase Rate", "Taxable Value", "GST %",
            "CGST Amt", "SGST Amt", "Total"
        ]];
        for (const pur of filteredPurchases) {
            const date = new Date(pur.createdAt).toLocaleDateString("en-IN");
            for (const item of (pur.items || [])) {
                const taxable = item.quantity * item.purchasePrice;
                const cgst = item.gstAmount / 2;
                const sgst = item.gstAmount / 2;
                purRows.push([
                    pur.billNumber,
                    date,
                    pur.supplier?.name || "",
                    pur.supplier?.gstin || "",
                    item.product?.hsnCode || "",
                    item.product?.name || "",
                    item.quantity,
                    item.freeQty || 0,
                    item.purchasePrice.toFixed(2),
                    taxable.toFixed(2),
                    item.gstRate,
                    cgst.toFixed(2),
                    sgst.toFixed(2),
                    item.totalAmount.toFixed(2),
                ]);
            }
        }
        // Small delay between downloads so browser doesn't block second one
        setTimeout(() => {
            downloadCSV(`GST_Purchase_${label}.csv`, purRows);
            setGstLoading(false);
        }, 300);
    };

    return (
        <RoleGate
            allowedRoles={["ADMIN", "ACCOUNTANT"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">
                        Financial reports and analytics are restricted to Administrators and Accountants.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6 pb-24 md:pb-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                        <p className="text-muted-foreground text-sm">Financial analytics and GST reports.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
                        />
                        <span className="text-slate-400 text-sm">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
                        />
                        <Button size="sm" onClick={handleDownloadGST} disabled={gstLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {gstLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download GST Report
                        </Button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total Sales</CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stats.totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" /> {filteredSales.length} invoices
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">GST Collected</CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stats.totalGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">CGST + SGST on sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total Purchases</CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stats.totalPurchases.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-blue-600 flex items-center mt-1">
                                <TrendingDown className="h-3 w-3 mr-1" /> {filteredPurchases.length} bills
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-red-100 bg-red-50/20">
                        <CardHeader className="pb-2 text-red-500 font-bold uppercase tracking-wider text-[10px]">Expiry Stock Value</CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">₹{stats.expiryRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-red-500 flex items-center mt-1">
                                <AlertOctagon className="h-3 w-3 mr-1" /> {expiring.length} batches near expiry
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="expiry" className="space-y-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="expiry">Expiry Risk Analysis</TabsTrigger>
                        <TabsTrigger value="sales">Recent Transactions</TabsTrigger>
                    </TabsList>

                    {/* Expiry Risk */}
                    <TabsContent value="expiry">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold text-red-600">Critical Expiry Alerts (Next 30 Days)</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table className="min-w-[550px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Product</TableHead>
                                            <TableHead>Batch</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead className="text-right">Remaining Stock</TableHead>
                                            <TableHead className="text-right">Stock Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                        ) : expiring.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No critical expiries found.</TableCell></TableRow>
                                        ) : expiring.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium text-slate-900">{b.product.name}</TableCell>
                                                <TableCell className="font-mono text-xs uppercase">{b.batchNumber}</TableCell>
                                                <TableCell className="text-red-500 font-semibold">{new Date(b.expiryDate).toLocaleDateString("en-IN")}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">{b.currentStock} Units</TableCell>
                                                <TableCell className="text-right font-mono text-slate-600">₹{(b.currentStock * b.salePrice).toLocaleString("en-IN")}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Recent Transactions */}
                    <TabsContent value="sales">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-slate-500" />
                                    Recent Transactions
                                    <span className="ml-auto text-xs font-normal text-muted-foreground">{filteredSales.length} invoices in period</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table className="min-w-[560px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Invoice No</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">GST</TableHead>
                                            <TableHead className="text-right">Net Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                        ) : filteredSales.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions found for selected period.</TableCell></TableRow>
                                        ) : filteredSales.slice(0, 20).map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-mono font-bold text-slate-700 text-xs">{s.invoiceNumber}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleDateString("en-IN")}</TableCell>
                                                <TableCell className="text-sm font-medium text-slate-800">{s.customer?.name || "—"}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">₹{(s.gstAmount || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">₹{(s.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </RoleGate>
    );
}
