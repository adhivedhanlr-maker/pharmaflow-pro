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
import { Skeleton } from "@/components/ui/skeleton";
import {
    TrendingUp,
    TrendingDown,
    AlertOctagon,
    FileText,
    FileSpreadsheet,
    ShieldAlert,
    Receipt,
    ShoppingCart,
    Users,
    Package,
    UserCheck,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
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
    date: string;
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
    date: string;
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

interface Profitability {
    revenue: number;
    profit: number;
    margin: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ReportsPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
    const [profitability, setProfitability] = useState<Profitability | null>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({ companyName: "Company" });
    const [loading, setLoading] = useState(false);
    const [reportMode, setReportMode] = useState<ReportMode>("SUMMARY");
    const [salesSearch, setSalesSearch] = useState("");
    const [purchasesSearch, setPurchasesSearch] = useState("");

    // Default: current month
    const now = new Date();
    const [startDate, setStartDate] = useState(
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

    // Re-fetch whenever token or dates change
    useEffect(() => {
        if (token) {
            fetchReports();
            fetchProfile();
        }
    }, [token, startDate, endDate]);

    const fetchProfile = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const [profileRes, brandingRes] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`, {
                    signal: controller.signal,
                }),
            ]);
            clearTimeout(timeout);
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
        } catch { /* non-critical */ }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const [saleRes, expRes, purRes] = await Promise.all([
                fetch(`${API_BASE}/sales/invoices?startDate=${startDate}&endDate=${endDate}`, { headers, signal: controller.signal }),
                fetch(`${API_BASE}/inventory/alerts/expiring`, { headers, signal: controller.signal }),
                fetch(`${API_BASE}/purchases?startDate=${startDate}&endDate=${endDate}`, { headers, signal: controller.signal }),
            ]);
            clearTimeout(timeout);

            if (saleRes.ok) setSales(await saleRes.json());
            else toast.error("Failed to load sales data.");

            if (expRes.ok) setExpiring(await expRes.json());
            if (purRes.ok) setPurchases(await purRes.json());
            else toast.error("Failed to load purchases data.");
        } catch (error: any) {
            if (error?.name !== "AbortError") {
                toast.error("Failed to load reports. Please refresh.");
            }
        } finally {
            setLoading(false);
        }

        // Fetch profitability separately (may fail for non-admin — ignore gracefully)
        try {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 10000);
            const profRes = await fetch(`${API_BASE}/reports/profitability?start=${startDate}&end=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller2.signal,
            });
            clearTimeout(timeout2);
            if (profRes.ok) setProfitability(await profRes.json());
        } catch { /* ignore */ }
    };

    // ── Computed analytics ────────────────────────────────────────────────────

    const stats = useMemo(() => ({
        totalSales: sales.reduce((a, s) => a + (s.netAmount || 0), 0),
        totalGst: sales.reduce((a, s) => a + (s.gstAmount || 0), 0),
        totalPurchases: purchases.reduce((a, p) => a + (p.netAmount || 0), 0),
    }), [sales, purchases]);

    const topCustomers = useMemo(() => {
        const map = new Map<string, number>();
        sales.forEach(s => {
            const name = s.customer?.name || "Walk-in";
            map.set(name, (map.get(name) || 0) + (s.netAmount || 0));
        });
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [sales]);

    const topProducts = useMemo(() => {
        const map = new Map<string, number>();
        sales.forEach(s => s.items?.forEach(item => {
            const name = item.product?.name || "Unknown";
            map.set(name, (map.get(name) || 0) + (item.quantity || 0));
        }));
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [sales]);

    const staffPerformance = useMemo(() => {
        const map = new Map<string, { invoices: number; revenue: number }>();
        sales.forEach(s => {
            const name = s.user?.name || "Unknown";
            const cur = map.get(name) || { invoices: 0, revenue: 0 };
            map.set(name, { invoices: cur.invoices + 1, revenue: cur.revenue + (s.netAmount || 0) });
        });
        return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    }, [sales]);

    const filteredSales = useMemo(() => {
        if (!salesSearch.trim()) return sales;
        const q = salesSearch.toLowerCase();
        return sales.filter(s =>
            s.invoiceNumber?.toLowerCase().includes(q) ||
            s.customer?.name?.toLowerCase().includes(q)
        );
    }, [sales, salesSearch]);

    const filteredPurchases = useMemo(() => {
        if (!purchasesSearch.trim()) return purchases;
        const q = purchasesSearch.toLowerCase();
        return purchases.filter(p =>
            p.billNumber?.toLowerCase().includes(q) ||
            p.supplier?.name?.toLowerCase().includes(q)
        );
    }, [purchases, purchasesSearch]);

    // ── GST report helpers ────────────────────────────────────────────────────

    const periodLabel = `${startDate} to ${endDate}`;

    const buildSaleRows = (): InvoiceRow[] =>
        sales.map(sale => ({
            refNumber: sale.invoiceNumber,
            dateKey: (sale.date || sale.createdAt).slice(0, 10),
            date: new Date(sale.date || sale.createdAt).toLocaleDateString("en-IN"),
            partyName: sale.customer?.name || "",
            partyGstin: sale.customer?.gstin || "",
            taxableValue: sale.totalAmount - sale.gstAmount,
            cgst: sale.gstAmount / 2,
            sgst: sale.gstAmount / 2,
            netAmount: sale.netAmount,
        }));

    const buildPurchaseRows = (): InvoiceRow[] =>
        purchases.map(pur => ({
            refNumber: pur.billNumber,
            dateKey: (pur.date || pur.createdAt).slice(0, 10),
            date: new Date(pur.date || pur.createdAt).toLocaleDateString("en-IN"),
            partyName: pur.supplier?.name || "",
            partyGstin: pur.supplier?.gstin || "",
            taxableValue: pur.netAmount - pur.gstAmount,
            cgst: pur.gstAmount / 2,
            sgst: pur.gstAmount / 2,
            netAmount: pur.netAmount,
        }));

    const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    const skeletonRows = (cols: number) => Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
            {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
            ))}
        </TableRow>
    ));

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
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                    <p className="text-muted-foreground text-sm">Financial analytics and GST filing reports.</p>
                </div>

                {/* ── Date filter + toggle row ── */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white" />
                        <span className="text-slate-400 text-sm shrink-0">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white" />
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        {(["SUMMARY", "DETAILED"] as ReportMode[]).map(m => (
                            <button key={m}
                                onClick={() => setReportMode(m)}
                                className={`px-5 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                                    reportMode === m
                                        ? "bg-slate-800 text-white"
                                        : "bg-white text-slate-500 hover:bg-slate-50"
                                }`}>
                                {m === "SUMMARY" ? "Day-wise Summary" : "Invoice-wise Detailed"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sales Revenue</p>
                            {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                                <div className="text-xl font-bold text-slate-900">{inr(stats.totalSales)}</div>
                            )}
                            <div className="text-xs text-green-600 flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" /> {sales.length} invoices
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">GST Collected</p>
                            {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                                <div className="text-xl font-bold text-slate-900">{inr(stats.totalGst)}</div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">CGST + SGST on sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Purchases</p>
                            {loading ? <Skeleton className="h-7 w-24 mb-1" /> : (
                                <div className="text-xl font-bold text-slate-900">{inr(stats.totalPurchases)}</div>
                            )}
                            <div className="text-xs text-blue-600 flex items-center mt-1">
                                <TrendingDown className="h-3 w-3 mr-1" /> {purchases.length} bills
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={profitability && profitability.profit >= 0 ? "border-emerald-100 bg-emerald-50/20" : "border-red-100 bg-red-50/20"}>
                        <CardContent className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Gross Profit</p>
                            {loading || !profitability ? <Skeleton className="h-7 w-24 mb-1" /> : (
                                <div className={`text-xl font-bold ${profitability.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                    {inr(profitability.profit)}
                                </div>
                            )}
                            {profitability && (
                                <p className="text-xs text-muted-foreground mt-1">{profitability.margin.toFixed(1)}% margin</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── GST Reports Card ── */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-slate-700">GST Reports</CardTitle>
                        <p className="text-xs text-slate-400">
                            {reportMode === "SUMMARY"
                                ? "Totals grouped by date — ideal for quick GST filing overview"
                                : "One row per invoice/bill — full detail for auditing"}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Receipt className="h-4 w-4 text-emerald-700" />
                                    <span className="text-sm font-bold text-emerald-800">GST Sales Report</span>
                                    <span className="ml-auto text-xs text-slate-400">{sales.length} invoices</span>
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
                            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShoppingCart className="h-4 w-4 text-blue-700" />
                                    <span className="text-sm font-bold text-blue-800">GST Purchase Report</span>
                                    <span className="ml-auto text-xs text-slate-400">{purchases.length} bills</span>
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

                {/* ── Insights Row ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Customers */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Users className="h-4 w-4 text-violet-600" />
                                Top Customers
                                <span className="ml-auto text-xs font-normal text-slate-400">by revenue</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="h-4 w-4 rounded-full" />
                                            <Skeleton className="h-4 flex-1" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : topCustomers.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No sales in this period.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topCustomers.map(([name, revenue], i) => (
                                        <div key={name} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-800 truncate">{name}</div>
                                                <div className="h-1.5 rounded-full bg-slate-100 mt-1">
                                                    <div
                                                        className="h-1.5 rounded-full bg-violet-500"
                                                        style={{ width: `${(revenue / (topCustomers[0]?.[1] || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 shrink-0">{inr(revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Package className="h-4 w-4 text-amber-600" />
                                Top Products
                                <span className="ml-auto text-xs font-normal text-slate-400">by units sold</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="h-4 w-4 rounded-full" />
                                            <Skeleton className="h-4 flex-1" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : topProducts.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No sales in this period.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topProducts.map(([name, qty], i) => (
                                        <div key={name} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-800 truncate">{name}</div>
                                                <div className="h-1.5 rounded-full bg-slate-100 mt-1">
                                                    <div
                                                        className="h-1.5 rounded-full bg-amber-500"
                                                        style={{ width: `${(qty / (topProducts[0]?.[1] || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 shrink-0">{qty} units</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Staff Performance ── */}
                {staffPerformance.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-blue-600" />
                                Staff Performance
                                <span className="ml-auto text-xs font-normal text-slate-400">invoices created in period</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Staff Member</TableHead>
                                        <TableHead className="text-right">Invoices</TableHead>
                                        <TableHead className="text-right">Revenue Generated</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffPerformance.map(([name, data]) => (
                                        <TableRow key={name}>
                                            <TableCell className="font-medium text-slate-800">{name}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-600">{data.invoices}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-800">{inr(data.revenue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* ── Transactions & Expiry Tabs ── */}
                <Tabs defaultValue="sales" className="space-y-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="sales">
                            Sales Transactions
                            {sales.length > 0 && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-bold">{sales.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="purchases">
                            Purchase Transactions
                            {purchases.length > 0 && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-bold">{purchases.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="expiry">
                            Expiry Risk
                            {expiring.length > 0 && <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-bold">{expiring.length}</span>}
                        </TabsTrigger>
                    </TabsList>

                    {/* Sales Transactions */}
                    <TabsContent value="sales">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-slate-500" />
                                        Sales Transactions
                                    </CardTitle>
                                    <div className="relative ml-auto w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            placeholder="Search invoice or customer..."
                                            value={salesSearch}
                                            onChange={e => setSalesSearch(e.target.value)}
                                            className="pl-8 h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table className="min-w-[560px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Invoice No</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Taxable</TableHead>
                                            <TableHead className="text-right">GST</TableHead>
                                            <TableHead className="text-right">Net Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? skeletonRows(6) : filteredSales.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                {salesSearch ? "No results match your search." : "No transactions in selected period."}
                                            </TableCell></TableRow>
                                        ) : filteredSales.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-mono font-bold text-slate-700 text-xs">{s.invoiceNumber}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">{new Date(s.date || s.createdAt).toLocaleDateString("en-IN")}</TableCell>
                                                <TableCell className="text-sm font-medium text-slate-800">{s.customer?.name || "—"}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">₹{((s.totalAmount || 0) - (s.gstAmount || 0)).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">₹{(s.gstAmount || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">₹{(s.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Purchase Transactions */}
                    <TabsContent value="purchases">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-slate-500" />
                                        Purchase Transactions
                                    </CardTitle>
                                    <div className="relative ml-auto w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            placeholder="Search bill or supplier..."
                                            value={purchasesSearch}
                                            onChange={e => setPurchasesSearch(e.target.value)}
                                            className="pl-8 h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table className="min-w-[560px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Bill No</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead className="text-right">Taxable</TableHead>
                                            <TableHead className="text-right">GST</TableHead>
                                            <TableHead className="text-right">Net Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? skeletonRows(6) : filteredPurchases.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                {purchasesSearch ? "No results match your search." : "No purchases in selected period."}
                                            </TableCell></TableRow>
                                        ) : filteredPurchases.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono font-bold text-slate-700 text-xs">{p.billNumber}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">{new Date(p.date || p.createdAt).toLocaleDateString("en-IN")}</TableCell>
                                                <TableCell className="text-sm font-medium text-slate-800">{p.supplier?.name || "—"}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">₹{((p.netAmount || 0) - (p.gstAmount || 0)).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-500">₹{(p.gstAmount || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">₹{(p.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Expiry Risk */}
                    <TabsContent value="expiry">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-red-600 flex items-center gap-2">
                                    <AlertOctagon className="h-4 w-4" />
                                    Critical Expiry Alerts (Next 90 Days)
                                </CardTitle>
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
                                        {loading ? skeletonRows(5) : expiring.length === 0 ? (
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
                </Tabs>
            </div>
        </RoleGate>
    );
}
