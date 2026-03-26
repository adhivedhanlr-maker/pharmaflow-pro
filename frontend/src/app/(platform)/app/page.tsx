"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Package, RefreshCw, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SalesRepDashboard } from "@/components/dashboard/sales-rep-dashboard";
import { BillingDashboard } from "@/components/dashboard/billing-dashboard";
import { WarehouseDashboard } from "@/components/dashboard/warehouse-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";
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
  const roleLabel = role ? role.replace(/_/g, " ").toLowerCase() : "your workspace";
  const headers = useMemo(() => createRequestHeaders(token), [token]);

  useEffect(() => {
    if (!socket || role === "SALES_REP") return;
    const handleNewOrder = () => setStats((prev) => ({ ...prev, salesToday: prev.salesToday + 1 }));
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
        setDashboardWarning("Some dashboard data could not be loaded. You can keep using the app and refresh once the connection stabilizes.");
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
      value: stats.salesToday.toString(),
      description: "Total invoices generated",
      icon: TrendingUp,
      color: "text-green-600",
      roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"],
    },
    {
      title: "Active Batches",
      value: stats.stockItems.toString(),
      description: "Items in inventory",
      icon: Package,
      color: "text-blue-600",
      roles: ["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"],
    },
    {
      title: "Total Customers",
      value: stats.customersCount.toString(),
      description: "Active database",
      icon: Users,
      color: "text-purple-600",
      roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"],
    },
    {
      title: "Expiring Soon",
      value: stats.expiringSoon.toString(),
      description: "Next 30 days",
      icon: AlertCircle,
      color: "text-red-600",
      roles: ["ADMIN", "WAREHOUSE_MANAGER"],
    },
  ];

  const filteredStats = statConfig.filter((stat) => hasRoleAccess(role, stat.roles));

  if (role === "SALES_REP") return <SalesRepDashboard />;
  if (role === "BILLING_OPERATOR") return <BillingDashboard />;
  if (role === "WAREHOUSE_MANAGER") return <WarehouseDashboard />;
  if (role === "ACCOUNTANT") return <AccountantDashboard />;

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{displayName}</span>. Here&apos;s what&apos;s happening today in {roleLabel}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchStats()}
          disabled={loading || !token || !role}
          className="self-start transition-colors hover:bg-blue-50 hover:text-blue-600 sm:self-auto"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {dashboardWarning && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <AlertCircle className="h-4 w-4 !text-blue-700" />
          <AlertTitle>Dashboard data is partially available</AlertTitle>
          <AlertDescription>{dashboardWarning}</AlertDescription>
        </Alert>
      )}

      {isAdminLikeRole(role) && profileAlertMessage && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <ShieldAlert className="h-4 w-4 !text-amber-700" />
          <AlertTitle>Complete distributor profile</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{profileAlertMessage}</span>
            <Link href="/app/settings" className="text-sm font-semibold text-amber-800 underline underline-offset-4">
              Open Settings
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filteredStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold transition-opacity", loading && "opacity-50")}>
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RoleGate allowedRoles={["ADMIN", "ACCOUNTANT", "BILLING_OPERATOR"]}>
          <div className="col-span-1 md:col-span-2 lg:col-span-4">
            <SalesChart />
          </div>
        </RoleGate>
        <RoleGate allowedRoles={["ADMIN", "WAREHOUSE_MANAGER"]}>
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Inventory Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Healthy Items</span>
                  <span className="font-bold text-green-600">{stats.inventoryHealth}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${stats.inventoryHealth}%` }} />
                </div>
                <p className="text-[10px]">Based on current stock levels and expiry dates.</p>
              </div>
            </CardContent>
          </Card>
        </RoleGate>
      </div>
    </div>
  );
}
