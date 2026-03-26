"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, TrendingDown, RefreshCw, ArrowRight, PackagePlus, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Batch {
    id: string;
    batchNumber: string;
    currentStock: number;
    expiryDate: string;
    product?: { name: string };
}

interface WarehouseStats {
    totalBatches: number;
    expiringSoon: number;
    lowStock: number;
    totalProducts: number;
    expiringList: Batch[];
    lowStockList: Batch[];
}

const EMPTY: WarehouseStats = { totalBatches: 0, expiringSoon: 0, lowStock: 0, totalProducts: 0, expiringList: [], lowStockList: [] };

export function WarehouseDashboard() {
    const { token, user } = useAuth();
    const [stats, setStats] = useState<WarehouseStats>(EMPTY);
    const [loading, setLoading] = useState(true);

    const displayName = user?.name?.trim() || user?.username?.trim() || "there";

    const fetchData = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [productsRes, expiringRes, lowStockRes] = await Promise.all([
                fetch(`${API_BASE}/inventory/products`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/inventory/alerts/expiring`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/inventory/alerts/low-stock`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const productsBody = productsRes.ok ? await productsRes.json() : { data: [] };
            const expiringBody = expiringRes.ok ? await expiringRes.json() : [];
            const lowStockBody = lowStockRes.ok ? await lowStockRes.json() : [];

            const products = Array.isArray(productsBody?.data) ? productsBody.data : [];
            const expiring: Batch[] = Array.isArray(expiringBody) ? expiringBody : [];
            const lowStockProducts = Array.isArray(lowStockBody) ? lowStockBody : [];

            const totalBatches = products.reduce((s: number, p: { batches?: unknown[] }) => s + (p.batches?.length || 0), 0);
            const lowStockBatches: Batch[] = lowStockProducts.flatMap((p: { name: string; batches?: Batch[] }) =>
                (p.batches || []).map((b: Batch) => ({ ...b, product: { name: p.name } }))
            ).slice(0, 8);

            setStats({
                totalBatches,
                totalProducts: products.length,
                expiringSoon: expiring.length,
                lowStock: lowStockBatches.length,
                expiringList: expiring.slice(0, 8),
                lowStockList: lowStockBatches,
            });
        } catch (e) {
            console.error("Warehouse dashboard error:", e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { if (token) fetchData(); }, [token]);

    const daysUntilExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const statCards = [
        { title: "Total Products", value: stats.totalProducts.toString(), description: "In product catalogue", icon: Package, color: "text-blue-600" },
        { title: "Active Batches", value: stats.totalBatches.toString(), description: "Across all products", icon: PackagePlus, color: "text-green-600" },
        { title: "Expiring Soon", value: stats.expiringSoon.toString(), description: "Within 30 days", icon: AlertTriangle, color: "text-orange-500" },
        { title: "Low Stock", value: stats.lowStock.toString(), description: "Batches below threshold", icon: TrendingDown, color: "text-red-600" },
    ];

    const quickActions = [
        { label: "New Purchase", href: "/app/purchases", icon: PackagePlus },
        { label: "View Stock", href: "/app/stock", icon: Package },
        { label: "Returns", href: "/app/returns", icon: RotateCcw },
    ];

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, <span className="font-semibold text-foreground">{displayName}</span>. Here&apos;s your inventory overview.
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
                <CardContent className="flex flex-wrap gap-2">
                    {quickActions.map(a => (
                        <Link key={a.label} href={a.href}>
                            <Button variant="outline" className="gap-2">
                                <a.icon className="h-4 w-4" />
                                {a.label}
                            </Button>
                        </Link>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Expiring Soon */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base">Expiring Soon</CardTitle>
                        <Link href="/app/stock">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                View Stock <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {stats.expiringList.length === 0 && !loading ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No batches expiring within 30 days.</p>
                        ) : (
                            <div className="divide-y">
                                {stats.expiringList.map(b => {
                                    const days = daysUntilExpiry(b.expiryDate);
                                    return (
                                        <div key={b.id} className="flex items-center justify-between px-6 py-3">
                                            <div>
                                                <p className="text-sm font-semibold">{b.product?.name || "—"}</p>
                                                <p className="text-xs text-muted-foreground">Batch: {b.batchNumber} · Stock: {b.currentStock}</p>
                                            </div>
                                            <span className={cn("text-xs font-semibold", days <= 7 ? "text-red-600" : "text-orange-500")}>
                                                {days}d left
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base">Low Stock</CardTitle>
                        <Link href="/app/purchases">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Add Stock <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {stats.lowStockList.length === 0 && !loading ? (
                            <p className="text-sm text-muted-foreground text-center py-8">All stock levels are healthy.</p>
                        ) : (
                            <div className="divide-y">
                                {stats.lowStockList.map(b => (
                                    <div key={b.id} className="flex items-center justify-between px-6 py-3">
                                        <div>
                                            <p className="text-sm font-semibold">{b.product?.name || "—"}</p>
                                            <p className="text-xs text-muted-foreground">Batch: {b.batchNumber}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-red-600">{b.currentStock} left</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
