"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RangeOption = "day" | "week" | "month" | "year" | "custom";

interface SalesPoint {
    date: string;
    label: string;
    total: number;
}

export function SalesChart() {
    const { token } = useAuth();
    const [data, setData] = useState<SalesPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<RangeOption>("week");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setData([]);
            return;
        }

        if (range !== "custom") {
            void fetchAnalytics();
        }
    }, [token, range]);

    const fetchAnalytics = useCallback(async () => {
        if (!token) {
            return;
        }

        if (range === "custom" && (!startDate || !endDate)) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 12000);

        try {
            const params = new URLSearchParams({ range });
            if (range === "custom") {
                params.set("startDate", startDate);
                params.set("endDate", endDate);
            }

            const res = await fetch(`${API_BASE}/sales/analytics?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });

            if (!res.ok) {
                setData([]);
                return;
            }

            const analyticsData = await res.json();
            setData(Array.isArray(analyticsData.points) ? analyticsData.points : []);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
            setData([]);
        } finally {
            window.clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [token, range, startDate, endDate]);

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
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <CardTitle>Sales Overview</CardTitle>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <Select value={range} onValueChange={(value) => setRange(value as RangeOption)}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">Today</SelectItem>
                                <SelectItem value="week">Last 7 days</SelectItem>
                                <SelectItem value="month">This month</SelectItem>
                                <SelectItem value="year">This year</SelectItem>
                                <SelectItem value="custom">Custom range</SelectItem>
                            </SelectContent>
                        </Select>
                        {range === "custom" && (
                            <>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full md:w-[150px]"
                                />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full md:w-[150px]"
                                />
                                <Button onClick={() => void fetchAnalytics()} disabled={!startDate || !endDate || loading}>
                                    Apply
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data}>
                        <XAxis
                            dataKey="label"
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
                            tickFormatter={(value) => `Rs ${value}`}
                        />
                        <Tooltip
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
                            formatter={(value: number | string | undefined) => [`Rs ${(Number(value) || 0).toLocaleString()}`, "Sales"]}
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
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
