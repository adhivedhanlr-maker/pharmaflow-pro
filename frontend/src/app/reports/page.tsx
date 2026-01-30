"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    TrendingUp,
    AlertOctagon,
    Calendar,
    ArrowRight,
    Loader2,
    FileDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Sale {
    id: string;
    netAmount: number;
    gstAmount: number;
    createdAt: string;
}

interface ExpiringBatch {
    id: string;
    batchNumber: string;
    expiryDate: string;
    currentStock: number;
    salePrice: number;
    product: { name: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

import { cn } from "@/lib/utils";

export default function ReportsPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const saleRes = await fetch(`${API_BASE}/sales/invoices`);
            const expRes = await fetch(`${API_BASE}/inventory/alerts/expiring`);
            if (saleRes.ok) setSales(await saleRes.json());
            if (expRes.ok) setExpiring(await expRes.json());
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        totalSales: sales.reduce((acc, s) => acc + s.netAmount, 0),
        totalGst: sales.reduce((acc, s) => acc + s.gstAmount, 0),
        expiryRisk: expiring.reduce((acc, b) => acc + (b.currentStock * b.salePrice), 0),
        avgMargin: 20 // Placeholder
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Business Reports</h1>
                    <p className="text-muted-foreground">Financial analytics and inventory forecasting.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Lifetime</Button>
                    <Button onClick={() => window.print()}><FileDown className="mr-2 h-4 w-4" /> Export Report</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Total Sales
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">₹{stats.totalSales.toLocaleString()}</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> Real-time tracking
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        GST Collected
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">₹{stats.totalGst.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total CGST + SGST</p>
                    </CardContent>
                </Card>
                <Card className="border-red-100 bg-red-50/20">
                    <CardHeader className="pb-2 text-red-500 font-bold uppercase tracking-wider text-[10px]">
                        Expiry Stock Value
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{stats.expiryRisk.toLocaleString()}</div>
                        <div className="text-xs text-red-500 flex items-center mt-1">
                            <AlertOctagon className="h-3 w-3 mr-1" /> {expiring.length} Batches near expiry
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Net Orders
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{sales.length}</div>
                        <div className="text-xs text-blue-600 mt-1">Total invoices generated</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="expiry" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="expiry">Expiry Risk Analysis</TabsTrigger>
                    <TabsTrigger value="sales">Recent Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="expiry">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-red-600">Critical Expiry Alerts (Next 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Product</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead className="text-right">Remaining Stock</TableHead>
                                        <TableHead className="text-right">Stock Value</TableHead>
                                        <TableHead className="w-[150px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                    ) : expiring.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No critical expiries found.</TableCell></TableRow>
                                    ) : expiring.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-medium text-slate-900">{b.product.name}</TableCell>
                                            <TableCell className="font-mono text-xs uppercase">{b.batchNumber}</TableCell>
                                            <TableCell className="text-red-500 font-semibold">{new Date(b.expiryDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">{b.currentStock} Units</TableCell>
                                            <TableCell className="text-right font-mono text-slate-600">₹{(b.currentStock * b.salePrice).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" className="text-primary hover:bg-blue-50">
                                                    Action <ArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Invoice ID</TableHead>
                                        <TableHead>Sold By</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.slice(0, 10).map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString()}</TableCell>
                                            <TableCell className="font-mono font-bold text-slate-700">{s.id.slice(-8).toUpperCase()}</TableCell>
                                            <TableCell className="text-xs">
                                                {s.user ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900">{s.user.name}</span>
                                                        <span className="text-[10px] text-slate-500 lowercase">{s.user.role.replace('_', ' ')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Unknown</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">₹{s.netAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


