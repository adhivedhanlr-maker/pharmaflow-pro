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
    FileText,
    FileSpreadsheet,
    ShieldAlert,
    Receipt,
    ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import {
    openGstReportPdf,
    downloadGstReportExcel,
    type InvoiceRow,
    type ReportMode,
    type BusinessProfile
} from "@/lib/gst-report";

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

export default function ReportsPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({ companyName: "Company" });
    const [loading, setLoading] = useState(false);
    const [reportMode, setReportMode] = useState<ReportMode>("SUMMARY");

    // Default to current month
    const now = new Date();
    const [startDate, setStartDate] = useState(
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

    useEffect(() => {
        if (token) {
            fetchReports();
            fetchProfile();
        }
    }, [token]);

    const fetchProfile = async () => {
        try {
            const [profileRes, brandingRes] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
            ]);
            const profile = profileRes.ok ? await profileRes.json() : null;
            const branding = brandingRes.ok ? await brandingRes.json() : null;
            setBusinessProfile({
                companyName: profile?.companyName || branding?.companyName || "Company",
                address: profile?.address || branding?.address || "",
                phone: profile?.phone || "",
                email: profile?.email || "",
                gstin: profile?.gstin || "",
                panNo: profile?.panNo || "",
                dlNo: profile?.dlNo || "",
                fssaiNo: profile?.fssaiNo || "",
            });
        } catch { /* ignore */ }
    };

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
        sales.filter(s => { const d = s.createdAt.slice(0, 10); return d >= startDate && d <= endDate; }),
        [sales, startDate, endDate]);

    const filteredPurchases = useMemo(() =>
        purchases.filter(p => { const d = p.createdAt.slice(0, 10); return d >= startDate && d <= endDate; }),
        [purchases, startDate, endDate]);

    const stats = {
        totalSales: filteredSales.reduce((a, s) => a + (s.netAmount || 0), 0),
        totalGst: filteredSales.reduce((a, s) => a + (s.gstAmount || 0), 0),
        totalPurchases: filteredPurchases.reduce((a, p) => a + (p.netAmount || 0), 0),
        expiryRisk: expiring.reduce((a, b) => a + (b.currentStock * b.salePrice), 0),
    };

    const periodLabel = `${startDate} to ${endDate}`;

    // Build invoice-level rows (one row per invoice / bill)
    const buildSaleRows = (): InvoiceRow[] =>
        filteredSales.map(sale => ({
            refNumber: sale.invoiceNumber,
            dateKey: sale.createdAt.slice(0, 10),
            date: new Date(sale.createdAt).toLocaleDateString("en-IN"),
            partyName: sale.customer?.name || "",
            partyGstin: sale.customer?.gstin || "",
            taxableValue: sale.totalAmount - sale.gstAmount,
            cgst: sale.gstAmount / 2,
            sgst: sale.gstAmount / 2,
            netAmount: sale.netAmount,
        }));

    const buildPurchaseRows = (): InvoiceRow[] =>
        filteredPurchases.map(pur => ({
            refNumber: pur.billNumber,
            dateKey: pur.createdAt.slice(0, 10),
            date: new Date(pur.createdAt).toLocaleDateString("en-IN"),
            partyName: pur.supplier?.name || "",
            partyGstin: pur.supplier?.gstin || "",
            taxableValue: pur.netAmount - pur.gstAmount,
            cgst: pur.gstAmount / 2,
            sgst: pur.gstAmount / 2,
            netAmount: pur.netAmount,
        }));

    const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    return (
        <RoleGate
            allowedRoles={["ADMIN", "ACCOUNTANT"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full"><ShieldAlert className="h-16 w-16 text-red-500" /></div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">Financial reports are restricted to Administrators and Accountants.</p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6 pb-24 md:pb-0">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                        <p className="text-muted-foreground text-sm">Financial analytics and GST filing reports.</p>
                    </div>
                    {/* Date filter */}
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white" />
                        <span className="text-slate-400 text-sm">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white" />
                    </div>
                </div>

                {/* ── GST Report Download Cards ── */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="text-sm font-bold text-slate-700">GST Reports</CardTitle>
                            {/* Summary / Detailed toggle */}
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                                {(["SUMMARY", "DETAILED"] as ReportMode[]).map(m => (
                                    <button key={m}
                                        onClick={() => setReportMode(m)}
                                        className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                                            reportMode === m
                                                ? "bg-slate-800 text-white"
                                                : "bg-white text-slate-500 hover:bg-slate-50"
                                        }`}>
                                        {m === "SUMMARY" ? "Day-wise Summary" : "Invoice-wise Detailed"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {reportMode === "SUMMARY"
                                ? "Totals grouped by date — ideal for quick GST filing overview"
                                : "One row per invoice/bill — full detail for auditing"}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Sales */}
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Receipt className="h-4 w-4 text-emerald-700" />
                                    <span className="text-sm font-bold text-emerald-800">GST Sales Report</span>
                                    <span className="ml-auto text-xs text-slate-400">{filteredSales.length} invoices</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline"
                                        className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => openGstReportPdf(reportMode, "SALES", buildSaleRows(), businessProfile, periodLabel)}>
                                        <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
                                    </Button>
                                    <Button size="sm"
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => downloadGstReportExcel(reportMode, "SALES", buildSaleRows(), businessProfile, periodLabel)}>
                                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
                                    </Button>
                                </div>
                            </div>
                            {/* Purchase */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShoppingCart className="h-4 w-4 text-blue-700" />
                                    <span className="text-sm font-bold text-blue-800">GST Purchase Report</span>
                                    <span className="ml-auto text-xs text-slate-400">{filteredPurchases.length} bills</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline"
                                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                        onClick={() => openGstReportPdf(reportMode, "PURCHASE", buildPurchaseRows(), businessProfile, periodLabel)}>
                                        <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
                                    </Button>
                                    <Button size="sm"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => downloadGstReportExcel(reportMode, "PURCHASE", buildPurchaseRows(), businessProfile, periodLabel)}>
                                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sales Revenue</p>
                            <div className="text-xl font-bold text-slate-900">{inr(stats.totalSales)}</div>
                            <div className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" /> {filteredSales.length} invoices
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">GST Collected</p>
                            <div className="text-xl font-bold text-slate-900">{inr(stats.totalGst)}</div>
                            <p className="text-xs text-muted-foreground mt-1">CGST + SGST on sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Purchases</p>
                            <div className="text-xl font-bold text-slate-900">{inr(stats.totalPurchases)}</div>
                            <div className="text-xs text-blue-600 flex items-center mt-1">
                                <TrendingDown className="h-3 w-3 mr-1" /> {filteredPurchases.length} bills
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-red-100 bg-red-50/20">
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Expiry Stock Value</p>
                            <div className="text-xl font-bold text-red-600">{inr(stats.expiryRisk)}</div>
                            <div className="text-xs text-red-500 flex items-center mt-1">
                                <AlertOctagon className="h-3 w-3 mr-1" /> {expiring.length} batches near expiry
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Tabs ── */}
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
                                        ) : expiring.map(b => (
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
                                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions in selected period.</TableCell></TableRow>
                                        ) : filteredSales.slice(0, 20).map(s => (
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
