"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingDown, RefreshCw, ArrowRight, PackagePlus, RotateCcw, Clock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Batch {
    id: string;
    batchNumber: string;
    currentStock: number;
    expiryDate: string;
    product?: { name: string; packing?: string };
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

    const displayName = user?.name?.split(" ")[0] || "there";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

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

            // Build low stock batch list from lowStock products
            const lowStockBatches: Batch[] = lowStockProducts.flatMap((p: { name: string; packing?: string; batches?: Batch[] }) =>
                (p.batches || []).map((b: Batch) => ({ ...b, product: { name: p.name, packing: p.packing } }))
            ).slice(0, 6);

            setStats({
                totalBatches,
                totalProducts: products.length,
                expiringSoon: expiring.length,
                lowStock: lowStockBatches.length,
                expiringList: expiring.slice(0, 6),
                lowStockList: lowStockBatches,
            });
        } catch (e) {
            console.error("Warehouse dashboard error:", e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { if (token) fetchData(); }, [token]);

    const daysUntilExpiry = (date: string) => {
        const diff = new Date(date).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const statCards = [
        { title: "Total Products", value: stats.totalProducts, icon: Package, iconBg: "bg-blue-100", color: "text-blue-600", border: "border-t-blue-500" },
        { title: "Active Batches", value: stats.totalBatches, icon: PackagePlus, iconBg: "bg-emerald-100", color: "text-emerald-600", border: "border-t-emerald-500" },
        { title: "Expiring (30d)", value: stats.expiringSoon, icon: AlertTriangle, iconBg: "bg-amber-100", color: "text-amber-600", border: "border-t-amber-500" },
        { title: "Low Stock", value: stats.lowStock, icon: TrendingDown, iconBg: "bg-rose-100", color: "text-rose-600", border: "border-t-rose-500" },
    ];

    const quickActions = [
        { label: "New Purchase", href: "/purchases", bg: "bg-emerald-600 hover:bg-emerald-700", icon: PackagePlus },
        { label: "View Stock", href: "/stock", bg: "bg-blue-600 hover:bg-blue-700", icon: Package },
        { label: "Expiry Check", href: "/stock", bg: "bg-amber-500 hover:bg-amber-600", icon: AlertTriangle },
        { label: "Returns", href: "/returns", bg: "bg-rose-500 hover:bg-rose-600", icon: RotateCcw },
    ];

    return (
        <div className="space-y-5 pb-24 md:pb-0">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-emerald-200 text-sm font-medium mb-1">Warehouse Manager</p>
                        <h1 className="text-xl font-bold">{greeting}, {displayName}!</h1>
                        <p className="text-emerald-200 text-sm mt-0.5">
                            {stats.totalBatches} batches · {stats.expiringSoon > 0 ? `${stats.expiringSoon} expiring soon` : "All clear"}
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

            {/* Expiring Soon */}
            <Card className="shadow-sm border-t-4 border-t-amber-400">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                    <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Expiring Soon
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">Next 30 days</p>
                    </div>
                    <Link href="/stock">
                        <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                            Stock <ArrowRight className="h-3 w-3" />
                        </button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.expiringList.length === 0 && !loading ? (
                        <div className="py-8 text-center text-emerald-600 text-sm font-medium">All clear — no batches expiring soon</div>
                    ) : (
                        <div className="divide-y">
                            {stats.expiringList.map(b => {
                                const days = daysUntilExpiry(b.expiryDate);
                                const urgent = days <= 7;
                                return (
                                    <div key={b.id} className={cn("flex items-center justify-between px-4 py-3", urgent && "bg-red-50")}>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{b.product?.name || "—"}</p>
                                            <p className="text-[10px] text-slate-400">Batch: {b.batchNumber} · Stock: {b.currentStock}</p>
                                        </div>
                                        <div className={cn("text-xs font-bold px-2 py-1 rounded-full", urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                            {days}d left
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Low Stock */}
            {stats.lowStockList.length > 0 && (
                <Card className="shadow-sm border-t-4 border-t-rose-400">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-rose-500" /> Low Stock Alert
                        </CardTitle>
                        <Link href="/stock">
                            <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                                View <ArrowRight className="h-3 w-3" />
                            </button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {stats.lowStockList.map(b => (
                                <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{b.product?.name || "—"}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" /> Batch: {b.batchNumber}
                                        </p>
                                    </div>
                                    <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                                        {b.currentStock} left
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
