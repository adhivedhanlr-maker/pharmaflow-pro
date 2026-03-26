"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Users, TrendingUp, RefreshCw, ArrowRight, FileText, RotateCcw } from "lucide-react";
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

    const displayName = user?.name?.trim() || user?.username?.trim() || "there";
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.substring(0, 7);

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
        { title: "Invoices Today", value: stats.invoicesToday.toString(), description: "Billed today", icon: Receipt, color: "text-green-600" },
        { title: "Revenue Today", value: `₹${stats.revenueToday.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, description: "Total collected today", icon: TrendingUp, color: "text-blue-600" },
        { title: "This Month", value: stats.invoicesThisMonth.toString(), description: "Invoices this month", icon: FileText, color: "text-purple-600" },
        { title: "Customers", value: stats.totalCustomers.toString(), description: "Registered parties", icon: Users, color: "text-orange-500" },
    ];

    const quickActions = [
        { label: "New Bill", href: "/billing", icon: Receipt },
        { label: "Sales History", href: "/sales-history", icon: FileText },
        { label: "Parties", href: "/parties", icon: Users },
        { label: "Returns", href: "/returns", icon: RotateCcw },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Billing Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, <span className="font-semibold text-foreground">{displayName}</span>. Here&apos;s your billing overview for today.
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
                            <div className={cn("text-3xl font-bold transition-opacity", loading && "opacity-50")}>
                                {loading ? "..." : s.value}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions — mobile only (desktop has sidebar) */}
            <Card className="md:hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
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

            {/* Recent Invoices */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Recent Invoices</CardTitle>
                    <Link href="/sales-history">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.recentInvoices.length === 0 && !loading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No invoices yet.</p>
                    ) : (
                        <div className="divide-y">
                            {stats.recentInvoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">{inv.customer?.name || "Walk-in"}</p>
                                        <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">₹{inv.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                                        <p className="text-xs text-muted-foreground">GST ₹{inv.gstAmount.toFixed(0)}</p>
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
