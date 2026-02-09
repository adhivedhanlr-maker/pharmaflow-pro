"use client";

import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function SalesChart() {
    const { token } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchAnalytics();
        }
    }, [token]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_BASE}/sales/analytics?days=7`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const analyticsData = await res.json();
                // Format date for display (e.g., "2023-10-25" -> "Oct 25")
                const formattedData = analyticsData.map((item: any) => {
                    const date = new Date(item.date);
                    return {
                        ...item,
                        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    };
                });
                setData(formattedData);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="col-span-4 h-[350px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data}>
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip
                            formatter={(value: any) => [`₹${(Number(value) || 0).toLocaleString()}`, "Sales"]}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#2563eb"
                            fill="#3b82f6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
