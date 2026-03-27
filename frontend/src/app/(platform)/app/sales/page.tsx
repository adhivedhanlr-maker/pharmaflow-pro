"use client";

import { useState, useEffect, useRef } from "react";
import { printInvoiceNewWindow, printOnPage } from "@/lib/print-invoice";
import {
    format, isToday, isThisWeek, isThisMonth, isThisYear,
    parseISO, startOfDay, endOfDay, isWithinInterval,
} from "date-fns";
import {
    Search,
    Printer,
    FileText,
    Loader2,
    RefreshCw,
    Download,
    Trash2,
    Eye,
    Filter,
    X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import { InvoicePrint } from "@/components/billing/invoice-print";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PaymentFilter = "ALL" | "CASH" | "CREDIT" | "UPI" | "CARD";
type DateFilter = "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

interface SaleItem {
    id: string;
    quantity: number;
    freeQuantity?: number;
    unitPrice: number;
    totalAmount: number;
    gstAmount: number;
    product: {
        name: string;
        company?: string;
        packing?: string;
        hsnCode?: string;
        gstRate: number;
    };
    batch?: {
        batchNumber: string;
        mrp?: number;
        salePrice?: number;
        ptr?: number;
        pts?: number;
        expiryDate?: string;
    };
}

interface Sale {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    totalAmount: number;
    gstAmount: number;
    netAmount: number;
    discountAmount: number;
    paymentMethod: string;
    isCash: boolean;
    customerType?: string;
    customer: {
        name: string;
        address: string;
        gstin?: string;
        phone?: string;
    };
    items: SaleItem[];
}

export default function SalesHistoryPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
    const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (token) {
            fetchSales();
            fetchBusinessProfile();
        }
    }, [token]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sales/invoices`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSales(data.sort((a: Sale, b: Sale) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
        } catch (error) {
            console.error("Failed to fetch sales history:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusinessProfile = async () => {
        try {
            const [profileResponse, brandingResponse] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
            ]);
            const profileText = profileResponse.ok ? await profileResponse.text() : "";
            let profile = null;
            try { profile = profileText ? JSON.parse(profileText) : null; } catch { /* keep null */ }
            const branding = brandingResponse.ok ? await brandingResponse.json() : null;
            if (profile || branding) {
                setBusinessProfile({
                    companyName: profile?.companyName || branding?.companyName || "",
                    address: profile?.address || "",
                    email: profile?.email || "",
                    phone: profile?.phone || "",
                    logoUrl: profile?.logoUrl || branding?.logoUrl || "",
                    gstin: profile?.gstin || "",
                    panNo: profile?.panNo || "",
                    dlNo: profile?.dlNo || "",
                    fssaiNo: profile?.fssaiNo || "",
                    bankName: profile?.bankName || "",
                    bankBranch: profile?.bankBranch || "",
                    bankAccountNo: profile?.bankAccountNo || "",
                    bankIfsc: profile?.bankIfsc || "",
                    showLogo: profile?.showLogo ?? true,
                });
            }
        } catch (error) {
            console.error("Failed to fetch business profile:", error);
        }
    };

    const handleDeleteSale = async (id: string, invoiceNumber: string) => {
        if (!confirm(`Delete invoice "${invoiceNumber}"? This will reverse the stock. This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE}/sales/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setSales(prev => prev.filter(s => s.id !== id));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || "Failed to delete invoice.");
            }
        } catch {
            alert("Network error. Failed to delete invoice.");
        } finally {
            setDeletingId(null);
        }
    };

    const handlePrint = (sale: Sale) => {
        setSelectedInvoice(sale);
        setTimeout(() => {
            if (printRef.current) {
                printOnPage(printRef.current, sale.invoiceNumber, sale.customer.name);
            }
            setSelectedInvoice(null);
        }, 200);
    };

    const handleView = (sale: Sale) => {
        setSelectedInvoice(sale);
        setTimeout(() => {
            if (printRef.current) {
                printInvoiceNewWindow(printRef.current, sale.invoiceNumber, sale.customer.name, false);
            }
            setSelectedInvoice(null);
        }, 200);
    };

    const clearFilters = () => {
        setPaymentFilter("ALL");
        setDateFilter("ALL");
        setCustomFrom("");
        setCustomTo("");
        setSearchQuery("");
    };

    const filteredSales = sales.filter(s => {
        // Search filter
        const matchesSearch =
            s.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        // Payment method filter
        if (paymentFilter !== "ALL") {
            const method = s.paymentMethod || (s.isCash ? "CASH" : "CREDIT");
            if (method !== paymentFilter) return false;
        }

        // Date filter
        if (dateFilter !== "ALL") {
            const date = new Date(s.createdAt);
            if (dateFilter === "TODAY" && !isToday(date)) return false;
            if (dateFilter === "WEEK" && !isThisWeek(date, { weekStartsOn: 1 })) return false;
            if (dateFilter === "MONTH" && !isThisMonth(date)) return false;
            if (dateFilter === "YEAR" && !isThisYear(date)) return false;
            if (dateFilter === "CUSTOM") {
                if (customFrom) {
                    const from = startOfDay(parseISO(customFrom));
                    if (date < from) return false;
                }
                if (customTo) {
                    const to = endOfDay(parseISO(customTo));
                    if (date > to) return false;
                }
            }
        }

        return true;
    });

    const totalFiltered = filteredSales.reduce((sum, s) => sum + s.netAmount, 0);
    const hasActiveFilter = paymentFilter !== "ALL" || dateFilter !== "ALL" || searchQuery;

    const paymentOptions: { value: PaymentFilter; label: string }[] = [
        { value: "ALL", label: "All" },
        { value: "CASH", label: "Cash" },
        { value: "CREDIT", label: "Credit" },
        { value: "UPI", label: "UPI" },
        { value: "CARD", label: "Card" },
    ];

    const dateOptions: { value: DateFilter; label: string }[] = [
        { value: "ALL", label: "All Time" },
        { value: "TODAY", label: "Today" },
        { value: "WEEK", label: "This Week" },
        { value: "MONTH", label: "This Month" },
        { value: "YEAR", label: "This Year" },
        { value: "CUSTOM", label: "Custom" },
    ];

    return (
        <RoleGate allowedRoles={["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT"]}>
            <div className="space-y-4 pb-24 md:pb-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales History</h1>
                        <p className="text-muted-foreground">View and manage past invoices.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-[280px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoice or customer..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchSales} title="Refresh">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Filter bar */}
                <Card>
                    <CardContent className="p-3 space-y-3">
                        {/* Payment method filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0">Payment</span>
                            <div className="flex gap-1 flex-wrap">
                                {paymentOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setPaymentFilter(opt.value)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                            paymentFilter === opt.value
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0">Date</span>
                            <div className="flex gap-1 flex-wrap">
                                {dateOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setDateFilter(opt.value)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                            dateFilter === opt.value
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom date range */}
                        {dateFilter === "CUSTOM" && (
                            <div className="flex items-center gap-2 flex-wrap pl-[76px]">
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={e => setCustomFrom(e.target.value)}
                                    className="border rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                />
                                <span className="text-xs text-muted-foreground">to</span>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={e => setCustomTo(e.target.value)}
                                    className="border rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                />
                            </div>
                        )}

                        {/* Summary + clear */}
                        <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-xs text-muted-foreground">
                                {filteredSales.length} invoice{filteredSales.length !== 1 ? "s" : ""}
                                {" · "}
                                <span className="font-semibold text-slate-800">₹{totalFiltered.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                            </span>
                            {hasActiveFilter && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                                >
                                    <X className="h-3 w-3" /> Clear filters
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {/* Mobile card view */}
                        <div className="md:hidden divide-y">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredSales.length === 0 ? (
                                <p className="text-center py-10 text-muted-foreground text-sm">No invoices found.</p>
                            ) : filteredSales.map((sale) => (
                                <div key={sale.id} className="p-4 flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-semibold text-sm text-slate-900">{sale.invoiceNumber}</span>
                                            <Badge
                                                variant={sale.paymentMethod === "CREDIT" ? "secondary" : "default"}
                                                className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    sale.paymentMethod === "UPI" && "bg-indigo-500 hover:bg-indigo-600",
                                                    sale.paymentMethod === "CARD" && "bg-amber-500 hover:bg-amber-600"
                                                )}
                                            >
                                                {sale.paymentMethod || (sale.isCash ? "CASH" : "CREDIT")}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">{sale.customer.name}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className="font-bold text-slate-900 text-sm">₹{sale.netAmount.toLocaleString()}</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleView(sale)} className="h-8 w-8 p-0" title="View Invoice">
                                            <Eye className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handlePrint(sale)} className="h-8 w-8 p-0" title="Print / Save PDF">
                                            <Printer className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id, sale.invoiceNumber)} disabled={deletingId === sale.id} className="h-8 w-8 p-0 text-destructive hover:bg-red-50">
                                            {deletingId === sale.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Desktop table view */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40px] text-center">#</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right w-[90px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No invoices found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSales.map((sale, idx) => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}
                                                </TableCell>
                                                <TableCell className="font-mono font-medium">
                                                    {sale.invoiceNumber}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {sale.customer.name}
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                        {sale.customer.address}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={sale.paymentMethod === "CREDIT" ? "secondary" : "default"}
                                                        className={cn(
                                                            "text-[10px] font-bold uppercase",
                                                            sale.paymentMethod === "UPI" && "bg-indigo-500 hover:bg-indigo-600",
                                                            sale.paymentMethod === "CARD" && "bg-amber-500 hover:bg-amber-600"
                                                        )}
                                                    >
                                                        {sale.paymentMethod || (sale.isCash ? "CASH" : "CREDIT")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">
                                                    ₹{sale.netAmount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button variant="ghost" size="sm" onClick={() => handleView(sale)} className="h-8 w-8 p-0" title="View Invoice">
                                                            <Eye className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handlePrint(sale)} className="h-8 w-8 p-0" title="Print / Save PDF">
                                                            <Printer className="h-4 w-4 text-slate-500 hover:text-slate-700" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(sale.id, sale.invoiceNumber)} disabled={deletingId === sale.id} className="h-8 w-8 p-0 text-destructive hover:bg-red-50">
                                                            {deletingId === sale.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Off-screen invoice container */}
                <div style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", pointerEvents: "none", zIndex: -1 }}>
                    {selectedInvoice && (
                        <InvoicePrint
                            ref={printRef}
                            preview={true}
                            invoiceNumber={selectedInvoice.invoiceNumber}
                            date={new Date(selectedInvoice.createdAt)}
                            businessProfile={businessProfile}
                            customer={selectedInvoice.customer}
                            customerType={selectedInvoice.customerType as "PHARMACY" | "DISTRIBUTOR" | undefined}
                            items={selectedInvoice.items.map(item => ({
                                id: item.id,
                                name: item.product.name,
                                company: item.product.company,
                                packing: item.product.packing,
                                hsnCode: item.product.hsnCode,
                                batchNumber: item.batch?.batchNumber || "N/A",
                                expiryDate: item.batch?.expiryDate,
                                mrp: item.batch?.mrp || item.batch?.salePrice,
                                ptr: item.batch?.ptr,
                                quantity: item.quantity,
                                freeQuantity: item.freeQuantity || 0,
                                unitPrice: item.unitPrice,
                                gstRate: item.product.gstRate,
                                gstAmount: item.gstAmount,
                                total: item.totalAmount
                            }))}
                            totals={{
                                subtotal: selectedInvoice.totalAmount,
                                gst: selectedInvoice.gstAmount,
                                discount: selectedInvoice.discountAmount,
                                net: selectedInvoice.netAmount
                            }}
                        />
                    )}
                </div>

            </div>
        </RoleGate>
    );
}
