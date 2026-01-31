"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Search,
    ShoppingCart,
    CheckCircle2,
    AlertCircle,
    Clock,
    User,
    ArrowRight,
    RefreshCw,
    Package
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function RequirementsPage() {
    const { token } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        if (token) fetchOrders();
    }, [token]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error("Orders fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`${API_BASE}/orders/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.rep.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case "PROCESSING": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
            case "READY": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sales Requirements</h1>
                    <p className="text-muted-foreground">Manage incoming field staff requirements and check stock readiness.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by Order #, Customer, or Rep..."
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-sm font-medium">Capture Queue</CardTitle>
                    <CardDescription>Items highlighted in red require immediate purchase to fulfill.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/30">
                                <TableHead className="w-[150px]">Order Details</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                                        Syncing requirements...
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                                        No requirements found matching your search.
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrders.map((order) => {
                                const hasBackorder = order.items.some((i: any) => i.isBackorder);
                                return (
                                    <TableRow key={order.id} className={cn(hasBackorder && "bg-red-50/20 hover:bg-red-50/40")}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{order.orderNumber}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">
                                                    {format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{order.customer.name}</span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <User className="h-2 w-2" /> By {order.rep.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {order.items.map((item: any) => (
                                                    <div key={item.id} className="flex items-center gap-2">
                                                        <span className="text-[11px] font-medium min-w-[20px]">{item.quantity}x</span>
                                                        <span className="text-[11px] truncate max-w-[150px]">{item.product.name}</span>
                                                        {item.isBackorder && (
                                                            <Badge variant="destructive" className="h-4 p-0 px-1 text-[8px]">STOCK-OUT</Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold text-sm">₹{order.totalAmount.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(order.status)}
                                            {hasBackorder && order.status === "PENDING" && (
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-bold">
                                                    <AlertCircle className="h-3 w-3" /> PURCHASE REQ.
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {order.status === "PENDING" ? (
                                                <div className="flex justify-end gap-2">
                                                    {hasBackorder ? (
                                                        <Button size="sm" variant="outline" className="h-8 text-[11px] border-red-200 text-red-700 bg-red-50 hover:bg-red-100">
                                                            <Package className="h-3.5 w-3.5 mr-1" /> Create Purchase
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-[11px] bg-green-600 hover:bg-green-700"
                                                            onClick={() => updateStatus(order.id, "READY")}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Convert to Invoice
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="ghost" className="h-8 text-[11px]">
                                                    View Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
