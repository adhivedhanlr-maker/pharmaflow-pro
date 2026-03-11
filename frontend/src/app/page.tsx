"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TrendingUp,
  Package,
  Users,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import { SalesRepDashboard } from "@/components/dashboard/sales-rep-dashboard";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { io } from "socket.io-client";
import { cn } from "@/lib/utils";
import { SalesChart } from "@/components/dashboard/sales-chart";
import Link from "next/link";

interface Stats {
  salesToday: number;
  stockItems: number;
  customersCount: number;
  expiringSoon: number;
  inventoryHealth: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "SALES_REP") {
    return <SalesRepDashboard />;
  }

  // ... existing code for other roles
  const [stats, setStats] = useState<Stats>({
    salesToday: 0,
    stockItems: 0,
    customersCount: 0,
    expiringSoon: 0,
    inventoryHealth: 0,
  });
  const [loading, setLoading] = useState(false);
  const [profileAlertMessage, setProfileAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    if (user?.role === "ADMIN") {
      void fetchProfileCompleteness();
    }

    // Real-time synchronization
    const socket = io(API_BASE);

    socket.on("new-order", () => {
      setStats(prev => ({
        ...prev,
        salesToday: prev.salesToday + 1
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.role]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      };
      const [prodRes, custRes, expRes, lowStockRes, saleRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/products`, { headers }),
        fetch(`${API_BASE}/parties/customers`, { headers }),
        fetch(`${API_BASE}/inventory/alerts/expiring`, { headers }),
        fetch(`${API_BASE}/inventory/alerts/low-stock`, { headers }),
        fetch(`${API_BASE}/sales/invoices`, { headers })
      ]);

      const productsData = prodRes.ok ? await prodRes.json() : { data: [] };
      const customersData = custRes.ok ? await custRes.json() : { data: [] };
      const expiring = expRes.ok ? await expRes.json() : [];
      const lowStock = lowStockRes.ok ? await lowStockRes.json() : [];
      const sales = saleRes.ok ? await saleRes.json() : [];

      const products = productsData.data || productsData;
      const customers = customersData.data || customersData;
      const totalBatches = Array.isArray(products)
        ? products.reduce((acc: number, p: any) => acc + (p.batches?.length || 0), 0)
        : 0;
      const unhealthyCount = (Array.isArray(expiring) ? expiring.length : 0) + (Array.isArray(lowStock) ? lowStock.length : 0);
      const healthyCount = Math.max(totalBatches - unhealthyCount, 0);
      const inventoryHealth = totalBatches > 0
        ? Math.round((healthyCount / totalBatches) * 100)
        : 0;

      setStats({
        salesToday: Array.isArray(sales) ? sales.length : 0,
        stockItems: totalBatches,
        customersCount: Array.isArray(customers) ? customers.length : 0,
        expiringSoon: Array.isArray(expiring) ? expiring.length : 0,
        inventoryHealth,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileCompleteness = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`
      };

      const [profileResponse, brandingResponse] = await Promise.all([
        fetch(`${API_BASE}/business-profile`, { headers }),
        fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
      ]);

      const profileText = profileResponse.ok ? await profileResponse.text() : "";
      const profile = profileText ? JSON.parse(profileText) : null;
      const branding = brandingResponse.ok ? await brandingResponse.json() : null;

      const hasLogo = Boolean(profile?.logoUrl || branding?.logoUrl);
      const companyName = profile?.companyName || branding?.companyName || "";
      const missingFields = [
        !companyName && "company name",
        !hasLogo && "company logo",
        !profile?.gstin && "GSTIN",
        !profile?.email && "contact email",
        !profile?.phone && "phone number",
        !profile?.address && "full address",
      ].filter(Boolean) as string[];

      setProfileAlertMessage(
        missingFields.length > 0
          ? `Complete ${missingFields.join(", ")} to finish your invoice profile.`
          : null
      );
    } catch (error) {
      console.error("Failed to fetch profile completeness:", error);
    }
  };

  const statConfig = [
    {
      title: "Invoices Today",
      value: stats.salesToday.toString(),
      description: "Total invoices generated",
      icon: TrendingUp,
      color: "text-green-600",
      roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"]
    },
    {
      title: "Active Batches",
      value: stats.stockItems.toString(),
      description: "Items in inventory",
      icon: Package,
      color: "text-blue-600",
      roles: ["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"]
    },
    {
      title: "Total Customers",
      value: stats.customersCount.toString(),
      description: "Active database",
      icon: Users,
      color: "text-purple-600",
      roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"]
    },
    {
      title: "Expiring Soon",
      value: stats.expiringSoon.toString(),
      description: "Next 30 days",
      icon: AlertCircle,
      color: "text-red-600",
      roles: ["ADMIN", "WAREHOUSE_MANAGER"]
    },
  ];

  const filteredStats = statConfig.filter(stat => user && stat.roles.includes(user.role));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>.
            Here's what's happening today in {user?.role.replace('_', ' ').toLowerCase()}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchStats}
          disabled={loading}
          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {user?.role === "ADMIN" && profileAlertMessage && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <ShieldAlert className="h-4 w-4 !text-amber-700" />
          <AlertTitle>Complete distributor profile</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{profileAlertMessage}</span>
            <Link href="/settings" className="text-sm font-semibold text-amber-800 underline underline-offset-4">
              Open Settings
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold transition-opacity", loading && "opacity-50")}>
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
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
                <div className="text-sm text-muted-foreground space-y-4">
                  <div className="flex justify-between items-center">
                  <span>Healthy Items</span>
                  <span className="font-bold text-green-600">{stats.inventoryHealth}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${stats.inventoryHealth}%` }}
                  />
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
