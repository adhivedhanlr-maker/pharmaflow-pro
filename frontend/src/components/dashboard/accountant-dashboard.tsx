"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, ArrowRight, FileText, DollarSign, Users } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Invoice {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    netAmount: number;
    gstAmount: number;
    customer?: { name: string };
}

interface Purchase {
    id: string;
    createdAt: string;
    netAmount: number;
}

interface AccountantStats {
    monthlyRevenue: number;
    gstCollected: number;
    monthlyPurchases: number;
    totalCustomers: number;
    recentSales: Invoice[];
}

const EMPTY: AccountantStats = { monthlyRevenue: 0, gstCollected: 0, monthlyPurchases: 0, totalCustomers: 0, recentSales: [] };
const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function AccountantDashboard() {
    const { token, user } = useAuth();
    const [stats, setStats] = useState<AccountantStats>(EMPTY);
    const [loading, setLoading] = useState(true);

    const displayName = user?.name?.trim() || user?.username?.trim() || "there";
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const fetchData = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [salesRes, purchasesRes, customersRes] = await Promise.all([
                fetch(`${API_BASE}/sales/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/purchases`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/parties/customers`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const salesBody = salesRes.ok ? await salesRes.json() : [];
            const purchasesBody = purchasesRes.ok ? await purchasesRes.json() : [];
            const customersBody = customersRes.ok ? await customersRes.json() : { data: [] };

            const invoices: Invoice[] = Array.isArray(salesBody) ? salesBody : [];
            const purchases: Purchase[] = Array.isArray(purchasesBody) ? purchasesBody : [];
            const customers = Array.isArray(customersBody?.data) ? customersBody.data : [];

            const monthInvoices = invoices.filter(i => i.createdAt.startsWith(thisMonth));
            const monthPurchases = purchases.filter(p => p.createdAt.startsWith(thisMonth));

            setStats({
                monthlyRevenue: monthInvoices.reduce((s, i) => s + i.netAmount, 0),
                gstCollected: monthInvoices.reduce((s, i) => s + i.gstAmount, 0),
                monthlyPurchases: monthPurchases.reduce((s, p) => s + p.netAmount, 0),
                totalCustomers: customers.length,
                recentSales: invoices.slice(0, 8),
            });
        } catch (e) {
            console.error("Accountant dashboard error:", e);
        } finally {
            setLoading(false);
        }
    }, [token, thisMonth]);

    useEffect(() => { if (token) fetchData(); }, [token]);

    const netProfit = stats.monthlyRevenue - stats.monthlyPurchases;

    const statCards = [
        { title: "Monthly Revenue", value: fmt(stats.monthlyRevenue), description: `Total sales — ${monthLabel}`, icon: TrendingUp, color: "text-green-600" },
        { title: "GST Collected", value: fmt(stats.gstCollected), description: "Tax collected this month", icon: DollarSign, color: "text-blue-600" },
        { title: "Monthly Purchases", value: fmt(stats.monthlyPurchases), description: `Purchase cost — ${monthLabel}`, icon: TrendingDown, color: "text-red-600" },
        { title: "Customers", value: stats.totalCustomers.toString(), description: "Registered parties", icon: Users, color: "text-purple-600" },
    ];

    const quickActions = [
        { label: "GST Report", href: "/reports", icon: BarChart3 },
        { label: "Sales History", href: "/sales-history", icon: FileText },
        { label: "Receivables", href: "/receivables", icon: TrendingUp },
        { label: "Parties", href: "/parties", icon: Users },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accounts Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, <span className="font-semibold text-foreground">{displayName}</span>. Financial overview for {monthLabel}.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading} className="self-start sm:self-auto">
                    <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map(s => (
                    <Card key={s.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                            <s.icon className={`h-4 w-4 ${s.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold transition-opacity truncate", loading && "opacity-50")}>
                                {loading ? "..." : s.value}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {quickActions.map(a => (
                        <Link key={a.label} href={a.href}>
                            <Button variant="outline" className="w-full justify-start gap-2">
                                <a.icon className="h-4 w-4" />
                                {a.label}
                            </Button>
                        </Link>
                    ))}
                </CardContent>
            </Card>

            {/* P&L Summary */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Monthly P&L — {monthLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gross Revenue</span>
                        <span className="font-semibold text-green-600">{loading ? "..." : fmt(stats.monthlyRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Purchase Cost</span>
                        <span className="font-semibold text-red-600">− {loading ? "..." : fmt(stats.monthlyPurchases)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">GST Collected</span>
                        <span className="font-semibold text-blue-600">{loading ? "..." : fmt(stats.gstCollected)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                        <span className="font-semibold text-sm">Net (Revenue − Cost)</span>
                        <span className={cn("font-bold text-sm", netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                            {loading ? "..." : `${netProfit >= 0 ? "+" : ""}${fmt(netProfit)}`}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Recent Transactions</CardTitle>
                    <Link href="/sales-history">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.recentSales.length === 0 && !loading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
                    ) : (
                        <div className="divide-y">
                            {stats.recentSales.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">{inv.customer?.name || "Walk-in"}</p>
                                        <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-600">{fmt(inv.netAmount)}</p>
                                        <p className="text-xs text-muted-foreground">GST {fmt(inv.gstAmount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
