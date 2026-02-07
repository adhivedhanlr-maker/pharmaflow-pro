"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { io } from "socket.io-client";
import { DeliveryVerificationDialog } from "@/components/sales/delivery-verification-dialog";

interface DeliveryItem {
    id: string;
    invoiceNumber: string;
    customer: { name: string };
    totalAmount: number;
    deliveryStatus: string;
    createdAt: string;
}

export default function DeliveriesPage() {
    const { token } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [verificationOpen, setVerificationOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; customerName: string } | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        if (token) {
            fetchDeliveries();
        }

        const socket = io(API_BASE);
        socket.on('new-invoice', () => fetchDeliveries());

        return () => {
            socket.disconnect();
        };
    }, [token]);

    const fetchDeliveries = async () => {
        setLoading(true);
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

    const filteredDeliveries = deliveries.filter(d =>
        d.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case "DELIVERED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            case "RETURNED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Returned</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
                    <p className="text-muted-foreground">Track and verify delivery status.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDeliveries} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search invoices..."
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-sm font-medium">Delivery Queue</CardTitle>
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
