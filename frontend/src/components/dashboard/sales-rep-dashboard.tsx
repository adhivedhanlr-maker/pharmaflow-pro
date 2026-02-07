"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    TrendingUp,
    Package,
    MapPin,
    ClipboardList,
    Plus,
    Calendar,
    ArrowRight,
    RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStats {
    ordersToday: number;
    salesValueToday: number;
    pendingDeliveries: number;
    visitsToday: number;
    recentOrders: any[];
}

export function SalesRepDashboard() {
    const { token, user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        ordersToday: 0,
        salesValueToday: 0,
        pendingDeliveries: 0,
        visitsToday: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [ordersRes, deliveriesRes, visitsRes] = await Promise.all([
                fetch(`${API_BASE}/orders`, { headers }),
                fetch(`${API_BASE}/sales/invoices`, { headers }),
                fetch(`${API_BASE}/visits/my-visits`, { headers })
            ]);

            const orders = ordersRes.ok ? await ordersRes.json() : [];
            const deliveries = deliveriesRes.ok ? await deliveriesRes.json() : [];
            const visits = visitsRes.ok ? await visitsRes.json() : [];

            // Process Data
            const today = new Date().toISOString().split('T')[0];

            const todaysOrders = orders.filter((o: any) => o.createdAt.startsWith(today));
            const salesValue = todaysOrders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
            const pendingDeliveries = deliveries.filter((d: any) => d.deliveryStatus === 'PENDING').length;
            const visitsToday = visits.filter((v: any) => v.checkInTime.startsWith(today)).length;

            setStats({
                ordersToday: todaysOrders.length,
                salesValueToday: salesValue,
                pendingDeliveries,
                visitsToday,
                recentOrders: orders.slice(0, 5) // Last 5 orders
            });

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const statCards = [
        {
            title: "Orders Today",
            value: stats.ordersToday,
            icon: ClipboardList,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "Sales Value",
            value: `₹${stats.salesValueToday.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            title: "Pending Deliveries",
            value: stats.pendingDeliveries,
            icon: Package,
            color: "text-orange-600",
            bg: "bg-orange-50"
        },
        {
            title: "Visits Today",
            value: stats.visitsToday,
            icon: MapPin,
            color: "text-purple-600",
            bg: "bg-purple-50"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview for <span className="font-medium text-slate-900">{format(new Date(), "EEEE, dd MMMM")}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Link href="/rep/orders/create">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" /> New Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white hover:shadow-md transition-all duration-200 overflow-hidden relative group">
                        <div className={cn("absolute right-0 top-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-110", stat.bg.replace('bg-', 'bg-gradient-to-br from-').replace('-50', '-500 to-transparent'))} />
                        <CardContent className="p-5 relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                                </div>
                                {i === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Today</span>}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 truncate" title={String(stat.value)}>
                                    {stat.value}
                                </h3>
                                <p className="text-xs font-medium text-muted-foreground mt-1">{stat.title}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders List */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                        <div className="space-y-1">
                            <CardTitle className="text-base">Recent Orders</CardTitle>
                            <p className="text-xs text-muted-foreground">Latest transactions from your field visits.</p>
                        </div>
                        <Link href="/orders">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                View All <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <div className="divide-y divide-slate-100">
                            {stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm ring-2 ring-white">
                                                {order.customer.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{order.customer.name}</p>
                                                <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                    <span className="font-medium text-slate-500">{order.orderNumber}</span>
                                                    <span>•</span>
                                                    <span>{format(new Date(order.createdAt), "hh:mm a")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1",
                                                order.status === 'PENDING' ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                                                    order.status === 'READY' ? "bg-green-50 text-green-700 border border-green-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <ClipboardList className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-500">No orders placed today.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Activity */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg shadow-blue-900/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                        <CardHeader>
                            <CardTitle className="text-lg text-white font-semibold">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 relative z-10">
                            {[
                                { href: "/rep/orders/create", icon: ClipboardList, label: "Take Order" },
                                { href: "/visits", icon: MapPin, label: "Log Visit" },
                                { href: "/deliveries", icon: Package, label: "Verify Delivery" },
                                { href: "/visits/my-day", icon: Calendar, label: "My Day" }
                            ].map((action, idx) => (
                                <Link key={idx} href={action.href} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border border-white/5">
                                    <action.icon className="h-6 w-6 text-blue-100" />
                                    <span className="text-xs font-medium text-blue-50">{action.label}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold">Daily Progress</CardTitle>
                                <span className="text-xs font-medium text-slate-500">Target: ₹10k</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-bold text-slate-900">₹{stats.salesValueToday.toLocaleString()}</span>
                                    <span className={cn("text-xs font-medium",
                                        stats.salesValueToday >= 10000 ? "text-green-600" : "text-blue-600"
                                    )}>
                                        {Math.min(Math.round((stats.salesValueToday / 10000) * 100), 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000 ease-out",
                                            stats.salesValueToday >= 10000 ? "bg-green-500" : "bg-blue-600"
                                        )}
                                        style={{ width: `${Math.min((stats.salesValueToday / 10000) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.salesValueToday >= 10000
                                        ? "Great job! You hit your daily target! 🎉"
                                        : `₹${(10000 - stats.salesValueToday).toLocaleString()} more to reach your goal.`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
