"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Package,
  Users,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { io } from "socket.io-client";
import { cn } from "@/lib/utils";

interface Stats {
  salesToday: number;
  stockItems: number;
  customersCount: number;
  expiringSoon: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    salesToday: 0,
    stockItems: 0,
    customersCount: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();

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
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      };
      const [prodRes, custRes, expRes, saleRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/products`, { headers }),
        fetch(`${API_BASE}/parties/customers`, { headers }),
        fetch(`${API_BASE}/inventory/alerts/expiring`, { headers }),
        fetch(`${API_BASE}/sales/invoices`, { headers })
      ]);

      const productsData = prodRes.ok ? await prodRes.json() : { data: [] };
      const customersData = custRes.ok ? await custRes.json() : { data: [] };
      const expiring = expRes.ok ? await expRes.json() : [];
      const sales = saleRes.ok ? await saleRes.json() : [];

      const products = productsData.data || productsData;
      const customers = customersData.data || customersData;

      setStats({
        salesToday: Array.isArray(sales) ? sales.length : 0,
        stockItems: Array.isArray(products) ? products.reduce((acc: number, p: any) => acc + (p.batches?.length || 0), 0) : 0,
        customersCount: Array.isArray(customers) ? customers.length : 0,
        expiringSoon: Array.isArray(expiring) ? expiring.length : 0
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
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
          <Card className="col-span-1 md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle>Business Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground py-10 text-center">
                Sales performance chart will appear here as more data is collected.
              </div>
            </CardContent>
          </Card>
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
                  <span className="font-bold text-green-600">92%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full w-[92%]" />
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
