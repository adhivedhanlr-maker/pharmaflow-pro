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
    Package,
    Download
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { io } from "socket.io-client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryVerificationDialog } from "@/components/sales/delivery-verification-dialog";

interface DeliveryItem {
    id: string;
    invoiceNumber: string;
    customer: { name: string };
    totalAmount: number;
    deliveryStatus: string;
    createdAt: string;
}

export default function OrdersPage() {
    const { token, user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [verificationOpen, setVerificationOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; customerName: string } | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        if (token) {
            fetchOrders();
            fetchDeliveries();
        }

        const socket = io(API_BASE);
        socket.on('new-requirement', () => fetchOrders());
        socket.on('new-invoice', () => fetchDeliveries());

        return () => {
            socket.disconnect();
        };
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

    const fetchDeliveries = async () => {
        try {
            const res = await fetch(`${API_BASE}/sales/invoices`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDeliveries(data);
            }
        } catch (err) {
            console.error("Deliveries fetch failed:", err);
        }
    };

    const convertToInvoice = async (orderId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/orders/${orderId}/convert`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.message || "Failed to convert order");
                return;
            }

            fetchOrders();
            fetchDeliveries();

        } catch (err) {
            console.error("Conversion failed:", err);
            alert("An error occurred while converting the order.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyClick = (invoice: DeliveryItem) => {
        setSelectedInvoice({ id: invoice.id, customerName: invoice.customer.name });
        setVerificationOpen(true);
    };

    const onVerificationSuccess = () => {
        fetchDeliveries();
    };

    // Filter Logic
    const filteredOrders = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.rep.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDeliveries = deliveries.filter(d =>
        d.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case "PROCESSING": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
            case "READY": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Result</Badge>;
            case "DELIVERED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            case "RETURNED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Returned</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const exportCSV = () => {
        // ... existing export logic
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Field Operations</h1>
                    <p className="text-muted-foreground">Manage requirements and verify deliveries.</p>
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
                    placeholder="Search..."
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Tabs defaultValue="requirements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                </TabsList>

                <TabsContent value="requirements">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="text-sm font-medium">Capture Queue</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table className="min-w-[800px]">
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
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{order.orderNumber}</span>
                                                    <span className="text-[10px] text-slate-500">{format(new Date(order.createdAt), "dd MMM HH:mm")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{order.customer.name}</TableCell>
                                            <TableCell>{order.items.length} Items</TableCell>
                                            <TableCell>₹{order.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell className="text-right">
                                                {order.status === "PENDING" ? (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-[11px] bg-green-600 hover:bg-green-700"
                                                        onClick={() => convertToInvoice(order.id)}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Convert to Invoice
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="ghost" className="h-8 text-[11px]">
                                                        View Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredOrders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No requirements found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deliveries">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/30">
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDeliveries.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                            <TableCell>{invoice.customer.name}</TableCell>
                                            <TableCell>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</TableCell>
                                            <TableCell>₹{invoice.totalAmount}</TableCell>
                                            <TableCell>{getStatusBadge(invoice.deliveryStatus || 'PENDING')}</TableCell>
                                            <TableCell className="text-right">
                                                {(!invoice.deliveryStatus || invoice.deliveryStatus === 'PENDING') && (
                                                    <Button size="sm" onClick={() => handleVerifyClick(invoice)}>
                                                        Verify Delivery
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredDeliveries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">No deliveries found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {selectedInvoice && (
                <DeliveryVerificationDialog
                    invoiceId={selectedInvoice.id}
                    customerName={selectedInvoice.customerName}
                    isOpen={verificationOpen}
                    onOpenChange={setVerificationOpen}
                    onSuccess={onVerificationSuccess}
                />
            )}
        </div>
    );
}
