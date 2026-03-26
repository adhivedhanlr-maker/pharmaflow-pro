"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Users, TrendingUp, RefreshCw, ArrowRight, FileText, RotateCcw, Clock } from "lucide-react";
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

interface BillingStats {
    invoicesToday: number;
    revenueToday: number;
    totalCustomers: number;
    invoicesThisMonth: number;
    recentInvoices: Invoice[];
}

const EMPTY: BillingStats = { invoicesToday: 0, revenueToday: 0, totalCustomers: 0, invoicesThisMonth: 0, recentInvoices: [] };

export function BillingDashboard() {
    const { token, user } = useAuth();
    const [stats, setStats] = useState<BillingStats>(EMPTY);
    const [loading, setLoading] = useState(true);

    const displayName = user?.name?.split(" ")[0] || "there";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM

    const fetchData = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [invoicesRes, customersRes] = await Promise.all([
                fetch(`${API_BASE}/sales/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/parties/customers`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const invoicesBody = invoicesRes.ok ? await invoicesRes.json() : [];
            const customersBody = customersRes.ok ? await customersRes.json() : { data: [] };

            const invoices: Invoice[] = Array.isArray(invoicesBody) ? invoicesBody : [];
            const customers = Array.isArray(customersBody?.data) ? customersBody.data : [];

            const todayInvoices = invoices.filter(i => i.createdAt.startsWith(today));
            const monthInvoices = invoices.filter(i => i.createdAt.startsWith(thisMonth));

            setStats({
                invoicesToday: todayInvoices.length,
                revenueToday: todayInvoices.reduce((s, i) => s + i.netAmount, 0),
                totalCustomers: customers.length,
                invoicesThisMonth: monthInvoices.length,
                recentInvoices: invoices.slice(0, 8),
            });
        } catch (e) {
            console.error("Billing dashboard error:", e);
        } finally {
            setLoading(false);
        }
    }, [token, today, thisMonth]);

    useEffect(() => { if (token) fetchData(); }, [token]);

    const statCards = [
        { title: "Invoices Today", value: stats.invoicesToday, icon: Receipt, iconBg: "bg-blue-100", color: "text-blue-600", border: "border-t-blue-500" },
        { title: "Revenue Today", value: `₹${stats.revenueToday.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, iconBg: "bg-emerald-100", color: "text-emerald-600", border: "border-t-emerald-500" },
        { title: "This Month", value: stats.invoicesThisMonth, icon: FileText, iconBg: "bg-violet-100", color: "text-violet-600", border: "border-t-violet-500" },
        { title: "Customers", value: stats.totalCustomers, icon: Users, iconBg: "bg-orange-100", color: "text-orange-600", border: "border-t-orange-500" },
    ];

    const quickActions = [
        { label: "New Bill", href: "/billing", bg: "bg-blue-600 hover:bg-blue-700", icon: Receipt },
        { label: "Sales History", href: "/sales-history", bg: "bg-slate-700 hover:bg-slate-800", icon: FileText },
        { label: "Parties", href: "/parties", bg: "bg-orange-500 hover:bg-orange-600", icon: Users },
        { label: "Returns", href: "/returns", bg: "bg-rose-500 hover:bg-rose-600", icon: RotateCcw },
    ];

    return (
        <div className="space-y-5 pb-24 md:pb-0">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-blue-200 text-sm font-medium mb-1">Billing Operator</p>
                        <h1 className="text-xl font-bold">{greeting}, {displayName}!</h1>
                        <p className="text-blue-200 text-sm mt-0.5">
                            {stats.invoicesToday} {stats.invoicesToday === 1 ? "invoice" : "invoices"} billed today
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
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Overview</p>
                <div className="grid grid-cols-2 gap-3">
                    {statCards.map(s => (
                        <Card key={s.title} className={`border-t-4 shadow-sm ${s.border}`}>
                            <CardContent className="p-4">
                                <div className={`p-2 rounded-lg ${s.iconBg} w-fit mb-3`}>
                                    <s.icon className={`h-4 w-4 ${s.color}`} />
                                </div>
                                <div className={cn("text-2xl font-black text-slate-900", loading && "opacity-40")}>
                                    {loading ? "—" : s.value}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{s.title}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Invoices */}
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                    <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
                    <Link href="/sales-history">
                        <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                            View All <ArrowRight className="h-3 w-3" />
                        </button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.recentInvoices.length === 0 && !loading ? (
                        <div className="py-10 text-center text-slate-400 text-sm">No invoices yet.</div>
                    ) : (
                        <div className="divide-y">
                            {stats.recentInvoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {(inv.customer?.name || "?").substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{inv.customer?.name || "Walk-in"}</p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" />
                                                {inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">₹{inv.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                                        <p className="text-[10px] text-slate-400">GST: ₹{inv.gstAmount.toFixed(0)}</p>
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
