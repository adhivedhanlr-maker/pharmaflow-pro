"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle, Package, RefreshCw, ShieldAlert, TrendingUp, Users,
    Receipt, PackagePlus, BarChart3, ArrowRight, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SalesRepDashboard } from "@/components/dashboard/sales-rep-dashboard";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { cn } from "@/lib/utils";
import { hasRoleAccess, isAdminLikeRole } from "@/lib/roles";

interface Stats {
    salesToday: number;
    stockItems: number;
    customersCount: number;
    expiringSoon: number;
    inventoryHealth: number;
}

interface ProductWithBatches {
    batches?: Array<unknown>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const REQUEST_TIMEOUT_MS = 12000;
const EMPTY_STATS: Stats = {
    salesToday: 0,
    stockItems: 0,
    customersCount: 0,
    expiringSoon: 0,
    inventoryHealth: 0,
};

function createRequestHeaders(token: string | null): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJsonWithTimeout<T>(
    input: string,
    init?: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<{ ok: boolean; data: T | null; status: number | null; error?: string }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        if (!response.ok) return { ok: false, data: null, status: response.status, error: `Request failed with status ${response.status}` };
        const text = await response.text();
        const data = text ? (JSON.parse(text) as T) : null;
        return { ok: true, data, status: response.status };
    } catch (error) {
        const message = error instanceof Error
            ? (error.name === "AbortError" ? "Request timed out" : error.message)
            : "Request failed";
        return { ok: false, data: null, status: null, error: message };
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export default function Dashboard() {
    const { user, token, isLoading: authLoading } = useAuth();
    const { socket } = useSocket();
    const [stats, setStats] = useState<Stats>(EMPTY_STATS);
    const [loading, setLoading] = useState(false);
    const [dashboardWarning, setDashboardWarning] = useState<string | null>(null);
    const [profileAlertMessage, setProfileAlertMessage] = useState<string | null>(null);

    const role = user?.role?.trim() || null;
    const displayName = user?.name?.trim() || user?.username?.trim() || "there";
    const headers = useMemo(() => createRequestHeaders(token), [token]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    useEffect(() => {
        if (!socket || role === "SALES_REP") return;
        const handleNewOrder = () => setStats(prev => ({ ...prev, salesToday: prev.salesToday + 1 }));
        socket.on("new-order", handleNewOrder);
        return () => { socket.off("new-order", handleNewOrder); };
    }, [socket, role]);

    useEffect(() => {
        if (authLoading || !token || !role || role === "SALES_REP") return;
        void fetchStats();
        if (isAdminLikeRole(role)) void fetchProfileCompleteness();
        else setProfileAlertMessage(null);
    }, [authLoading, token, role]);

    const fetchStats = useCallback(async () => {
        if (!token || !role) {
            setStats(EMPTY_STATS);
            setDashboardWarning("Your session is still being restored. Please refresh if this continues.");
            return;
        }

        const requestDefinitions = [
            { key: "products", enabled: hasRoleAccess(role, ["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"]), request: () => fetchJsonWithTimeout<{ data?: ProductWithBatches[] }>(`${API_BASE}/inventory/products`, { headers }) },
            { key: "customers", enabled: hasRoleAccess(role, ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"]), request: () => fetchJsonWithTimeout<{ data?: unknown[] }>(`${API_BASE}/parties/customers`, { headers }) },
            { key: "expiring", enabled: hasRoleAccess(role, ["ADMIN", "WAREHOUSE_MANAGER"]), request: () => fetchJsonWithTimeout<unknown[]>(`${API_BASE}/inventory/alerts/expiring`, { headers }) },
            { key: "lowStock", enabled: hasRoleAccess(role, ["ADMIN", "WAREHOUSE_MANAGER"]), request: () => fetchJsonWithTimeout<unknown[]>(`${API_BASE}/inventory/alerts/low-stock`, { headers }) },
            { key: "sales", enabled: hasRoleAccess(role, ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"]), request: () => fetchJsonWithTimeout<unknown[]>(`${API_BASE}/sales/invoices`, { headers }) },
        ] as const;

        setLoading(true);
        setDashboardWarning(null);

        try {
            const settled = await Promise.all(requestDefinitions.map(async (def) => {
                if (!def.enabled) return [def.key, { ok: true, data: null, status: null }] as const;
                const result = await def.request();
                return [def.key, result] as const;
            }));

            const results = Object.fromEntries(settled) as Record<string, { ok: boolean; data: unknown; error?: string }>;
            const warnings = settled.reduce<string[]>((msgs, [key, result]) => {
                if (!result.ok) msgs.push(`${key}: ${"error" in result ? result.error || "failed" : "failed"}`);
                return msgs;
            }, []);

            const productsData = (results.products?.data ?? null) as { data?: ProductWithBatches[] } | null;
            const customersData = (results.customers?.data ?? null) as { data?: unknown[] } | null;
            const expiringData = (results.expiring?.data ?? null) as unknown[] | null;
            const lowStockData = (results.lowStock?.data ?? null) as unknown[] | null;
            const salesData = (results.sales?.data ?? null) as unknown[] | null;

            const products = Array.isArray(productsData?.data) ? productsData.data : [];
            const customers = Array.isArray(customersData?.data) ? customersData.data : [];
            const expiring = Array.isArray(expiringData) ? expiringData : [];
            const lowStock = Array.isArray(lowStockData) ? lowStockData : [];
            const sales = Array.isArray(salesData) ? salesData : [];
            const totalBatches = products.reduce((acc, p) => acc + (p.batches?.length || 0), 0);
            const unhealthyCount = expiring.length + lowStock.length;
            const healthyCount = Math.max(totalBatches - unhealthyCount, 0);
            const inventoryHealth = totalBatches > 0 ? Math.round((healthyCount / totalBatches) * 100) : 0;

            setStats({ salesToday: sales.length, stockItems: totalBatches, customersCount: customers.length, expiringSoon: expiring.length, inventoryHealth });
            if (warnings.length > 0) {
                setDashboardWarning("Some dashboard data could not be loaded. Refresh to try again.");
                console.error("Dashboard partial failures:", warnings);
            }
        } finally {
            setLoading(false);
        }
    }, [headers, role, token]);

    const fetchProfileCompleteness = useCallback(async () => {
        if (!token || !role || !isAdminLikeRole(role)) { setProfileAlertMessage(null); return; }

        const [profileResponse, brandingResponse] = await Promise.all([
            fetchJsonWithTimeout<Record<string, string | null>>(`${API_BASE}/business-profile`, { headers }),
            fetchJsonWithTimeout<Record<string, string | null>>(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
        ]);

        if (!profileResponse.ok && !brandingResponse.ok) { setProfileAlertMessage(null); return; }

        const profile = profileResponse.data ?? {};
        const branding = brandingResponse.data ?? {};
        const hasLogo = Boolean(profile.logoUrl || branding.logoUrl);
        const companyName = profile.companyName || branding.companyName || "";
        const missingFields = [
            !companyName && "company name",
            !hasLogo && "company logo",
            !profile.gstin && "GSTIN",
            !profile.email && "contact email",
            !profile.phone && "phone number",
            !profile.address && "full address",
        ].filter(Boolean) as string[];

        setProfileAlertMessage(missingFields.length > 0 ? `Complete ${missingFields.join(", ")} to finish your invoice profile.` : null);
    }, [headers, role, token]);

    const statConfig = [
        {
            title: "Invoices Today",
            value: stats.salesToday,
            description: "bills generated today",
            icon: Receipt,
            iconBg: "bg-blue-100",
            color: "text-blue-600",
            border: "border-t-blue-500",
            href: "/billing",
            roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"],
        },
        {
            title: "Active Batches",
            value: stats.stockItems,
            description: "batches in stock",
            icon: Package,
            iconBg: "bg-emerald-100",
            color: "text-emerald-600",
            border: "border-t-emerald-500",
            href: "/stock",
            roles: ["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"],
        },
        {
            title: "Customers",
            value: stats.customersCount,
            description: "registered parties",
            icon: Users,
            iconBg: "bg-violet-100",
            color: "text-violet-600",
            border: "border-t-violet-500",
            href: "/parties",
            roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"],
        },
        {
            title: "Expiring Soon",
            value: stats.expiringSoon,
            description: "batches in 30 days",
            icon: AlertCircle,
            iconBg: "bg-rose-100",
            color: "text-rose-600",
            border: "border-t-rose-500",
            href: "/stock",
            roles: ["ADMIN", "WAREHOUSE_MANAGER"],
        },
    ];

    const quickActions = [
        { label: "New Bill", href: "/billing", icon: Receipt, bg: "bg-blue-600 hover:bg-blue-700", roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT"] },
        { label: "Add Stock", href: "/purchases", icon: PackagePlus, bg: "bg-emerald-600 hover:bg-emerald-700", roles: ["ADMIN", "WAREHOUSE_MANAGER"] },
        { label: "Reports", href: "/reports", icon: BarChart3, bg: "bg-violet-600 hover:bg-violet-700", roles: ["ADMIN", "ACCOUNTANT"] },
        { label: "Parties", href: "/parties", icon: Users, bg: "bg-orange-500 hover:bg-orange-600", roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT"] },
    ];

    const filteredStats = statConfig.filter(s => hasRoleAccess(role, s.roles));
    const filteredActions = quickActions.filter(a => hasRoleAccess(role, a.roles));

    if (role === "SALES_REP") return <SalesRepDashboard />;

    return (
        <div className="space-y-5 pb-24 md:pb-0">

            {/* ── Header ── */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-blue-200 text-sm font-medium flex items-center gap-1.5 mb-1">
                            <Clock className="h-3.5 w-3.5" />{today}
                        </p>
                        <h1 className="text-xl font-bold leading-tight">
                            {greeting}, {displayName.split(" ")[0]}!
                        </h1>
                        <p className="text-blue-200 text-sm mt-0.5">Here&apos;s your pharmacy overview</p>
                    </div>
                    <button
                        onClick={() => void fetchStats()}
                        disabled={loading || !token || !role}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("h-4 w-4 text-white", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* ── Alerts ── */}
            {dashboardWarning && (
                <Alert className="border-blue-200 bg-blue-50 text-blue-900">
                    <AlertCircle className="h-4 w-4 !text-blue-700" />
                    <AlertTitle>Partial data</AlertTitle>
                    <AlertDescription>{dashboardWarning}</AlertDescription>
                </Alert>
            )}
            {isAdminLikeRole(role) && profileAlertMessage && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <ShieldAlert className="h-4 w-4 !text-amber-700" />
                    <AlertTitle>Complete your profile</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{profileAlertMessage}</span>
                        <Link href="/settings" className="text-sm font-semibold text-amber-800 underline underline-offset-4 shrink-0">Settings</Link>
                    </AlertDescription>
                </Alert>
            )}

            {/* ── Quick Actions ── */}
            {filteredActions.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Quick Actions</p>
                    <div className="grid grid-cols-4 gap-2">
                        {filteredActions.map(action => (
                            <Link key={action.label} href={action.href}>
                                <div className={`${action.bg} rounded-xl p-3 flex flex-col items-center gap-1.5 text-white transition-transform active:scale-95 shadow-sm`}>
                                    <action.icon className="h-5 w-5" />
                                    <span className="text-[10px] font-semibold leading-tight text-center">{action.label}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Overview</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {filteredStats.map(stat => (
                        <Link key={stat.title} href={stat.href}>
                            <Card className={cn(
                                "border-t-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]",
                                stat.border
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                        </div>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                                    </div>
                                    <div className={cn("text-3xl font-black text-slate-900 transition-opacity", loading && "opacity-40")}>
                                        {loading ? "—" : stat.value}
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">{stat.title}</p>
                                    <p className="text-[10px] text-slate-400">{stat.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RoleGate allowedRoles={["ADMIN", "ACCOUNTANT", "BILLING_OPERATOR"]}>
                    <div className="col-span-1 md:col-span-2 lg:col-span-4">
                        <SalesChart />
                    </div>
                </RoleGate>
                <RoleGate allowedRoles={["ADMIN", "WAREHOUSE_MANAGER"]}>
                    <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-t-4 border-t-emerald-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                Inventory Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-slate-900">{stats.inventoryHealth}%</span>
                                    <span className="text-sm text-emerald-600 font-semibold mb-1">healthy</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            stats.inventoryHealth >= 75 ? "bg-emerald-500" :
                                            stats.inventoryHealth >= 50 ? "bg-amber-400" : "bg-rose-500"
                                        )}
                                        style={{ width: `${stats.inventoryHealth}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>{stats.stockItems} total batches</span>
                                    <span>{stats.expiringSoon} expiring soon</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </RoleGate>
            </div>
        </div>
    );
}
