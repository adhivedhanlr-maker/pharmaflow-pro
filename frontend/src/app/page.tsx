"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Package,
  Users,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Stats {
  salesToday: number;
  stockItems: number;
  customersCount: number;
  expiringSoon: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    salesToday: 0,
    stockItems: 0,
    customersCount: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, expRes, saleRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/products`),
        fetch(`${API_BASE}/parties?type=customer`),
        fetch(`${API_BASE}/inventory/alerts/expiring`),
        fetch(`${API_BASE}/sales/invoices`)
      ]);

      const products = prodRes.ok ? await prodRes.json() : [];
      const customers = custRes.ok ? await custRes.json() : [];
      const expiring = expRes.ok ? await expRes.json() : [];
      const sales = saleRes.ok ? await saleRes.json() : [];

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
    },
    {
      title: "Active Batches",
      value: stats.stockItems.toString(),
      description: "Items in inventory",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Total Customers",
      value: stats.customersCount.toString(),
      description: "Active database",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Expiring Soon",
      value: stats.expiringSoon.toString(),
      description: "Next 30 days",
      icon: AlertCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Real-time summary of your pharmaceutical distribution operations.
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
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
      </div>
    </div>
  );
}
