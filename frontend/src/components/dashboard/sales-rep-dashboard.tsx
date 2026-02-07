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
                    <Card key={i} className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={cn("p-3 rounded-xl", stat.bg)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders List */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Orders</CardTitle>
                        <Link href="/orders" className="text-sm text-blue-600 hover:underline flex items-center">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {order.customer.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{order.customer.name}</p>
                                                <p className="text-xs text-muted-foreground">{order.orderNumber} • {format(new Date(order.createdAt), "HH:mm")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                                order.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                                    order.status === 'READY' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">No recent orders found.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Activity */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            <Link href="/rep/orders/create" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                                <ClipboardList className="h-6 w-6" />
                                <span className="text-xs font-medium">Take Order</span>
                            </Link>
                            <Link href="/visits" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                                <MapPin className="h-6 w-6" />
                                <span className="text-xs font-medium">Log Visit</span>
                            </Link>
                            <Link href="/deliveries" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                                <Package className="h-6 w-6" />
                                <span className="text-xs font-medium">Verify Delivery</span>
                            </Link>
                            <Link href="/visits/my-day" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors">
                                <Calendar className="h-6 w-6" />
                                <span className="text-xs font-medium">My Day</span>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Performance Goal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Daily Target</span>
                                    <span className="font-medium">₹10,000</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((stats.salesValueToday / 10000) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-right">{Math.round((stats.salesValueToday / 10000) * 100)}% Achieved</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
