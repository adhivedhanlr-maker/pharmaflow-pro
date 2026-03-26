"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    totalAmount: number;
    customer?: { name: string };
}

interface Purchase {
    id: string;
    billNumber: string;
    createdAt: string;
    netAmount: number;
    gstAmount: number;
    supplier?: { name: string };
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

    const displayName = user?.name?.split(" ")[0] || "there";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
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
    const profitPct = stats.monthlyRevenue > 0 ? ((netProfit / stats.monthlyRevenue) * 100).toFixed(1) : "0";

    const statCards = [
        { title: "Monthly Revenue", value: fmt(stats.monthlyRevenue), icon: TrendingUp, iconBg: "bg-emerald-100", color: "text-emerald-600", border: "border-t-emerald-500" },
        { title: "GST Collected", value: fmt(stats.gstCollected), icon: DollarSign, iconBg: "bg-blue-100", color: "text-blue-600", border: "border-t-blue-500" },
        { title: "Monthly Purchases", value: fmt(stats.monthlyPurchases), icon: TrendingDown, iconBg: "bg-rose-100", color: "text-rose-600", border: "border-t-rose-500" },
        { title: "Customers", value: stats.totalCustomers, icon: Users, iconBg: "bg-violet-100", color: "text-violet-600", border: "border-t-violet-500" },
    ];

    const quickActions = [
        { label: "GST Report", href: "/reports", bg: "bg-blue-600 hover:bg-blue-700", icon: BarChart3 },
        { label: "Sales History", href: "/sales-history", bg: "bg-slate-700 hover:bg-slate-800", icon: FileText },
        { label: "Receivables", href: "/receivables", bg: "bg-emerald-600 hover:bg-emerald-700", icon: TrendingUp },
        { label: "Parties", href: "/parties", bg: "bg-violet-600 hover:bg-violet-700", icon: Users },
    ];

    return (
        <div className="space-y-5 pb-24 md:pb-0">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 text-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-violet-200 text-sm font-medium mb-1">Accountant · {monthLabel}</p>
                        <h1 className="text-xl font-bold">{greeting}, {displayName}!</h1>
                        <p className="text-violet-200 text-sm mt-0.5">
                            {loading ? "Loading..." : `Revenue: ${fmt(stats.monthlyRevenue)} this month`}
                        </p>
                    </div>
                    <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">
                        <RefreshCw className={cn("h-4 w-4 text-white", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2">
                    {quickActions.map(a => (
                        <Link key={a.label} href={a.href}>
                            <div className={`${a.bg} rounded-xl p-3 flex flex-col items-center gap-1.5 text-white transition-transform active:scale-95 shadow-sm`}>
                                <a.icon className="h-5 w-5" />
                                <span className="text-[10px] font-semibold text-center leading-tight">{a.label}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">This Month — {monthLabel}</p>
                <div className="grid grid-cols-2 gap-3">
                    {statCards.map(s => (
                        <Card key={s.title} className={`border-t-4 shadow-sm ${s.border}`}>
                            <CardContent className="p-4">
                                <div className={`p-2 rounded-lg ${s.iconBg} w-fit mb-3`}>
                                    <s.icon className={`h-4 w-4 ${s.color}`} />
                                </div>
                                <div className={cn("text-xl font-black text-slate-900 truncate", loading && "opacity-40")}>
                                    {loading ? "—" : s.value}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{s.title}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* P&L Summary */}
            <Card className="shadow-sm border-t-4 border-t-violet-500">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-semibold">Monthly P&L Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Gross Revenue</span>
                        <span className="font-semibold text-emerald-600">{loading ? "—" : fmt(stats.monthlyRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Purchase Cost</span>
                        <span className="font-semibold text-rose-600">- {loading ? "—" : fmt(stats.monthlyPurchases)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">GST Collected</span>
                        <span className="font-semibold text-blue-600">{loading ? "—" : fmt(stats.gstCollected)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                        <span className="font-bold text-slate-800">Net (Revenue − Cost)</span>
                        <span className={cn("font-black text-base", netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {loading ? "—" : `${netProfit >= 0 ? "+" : ""}${fmt(netProfit)}`}
                            <span className="text-xs font-medium ml-1">({profitPct}%)</span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                    <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                    <Link href="/sales-history">
                        <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                            All <ArrowRight className="h-3 w-3" />
                        </button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.recentSales.length === 0 && !loading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">No transactions yet.</div>
                    ) : (
                        <div className="divide-y">
                            {stats.recentSales.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{inv.customer?.name || "Walk-in"}</p>
                                        <p className="text-[10px] text-slate-400">{inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-emerald-600">{fmt(inv.netAmount)}</p>
                                        <p className="text-[10px] text-slate-400">GST: {fmt(inv.gstAmount)}</p>
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
