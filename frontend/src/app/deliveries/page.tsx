"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Search, RefreshCw, MapPin, Eye, Loader2 } from "lucide-react";
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
    deliveryProof?: {
        id: string;
        proofUrl?: string;
        latitude?: number;
        longitude?: number;
        info?: string;
    };
    createdAt: string;
}

export default function DeliveriesPage() {
    const { token } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [verificationOpen, setVerificationOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; customerName: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

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

    const viewPhoto = async (id: string) => {
        setPreviewLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sales/${id}/delivery-proof`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                alert("Permission denied. You might need to log in again.");
                return;
            }

            if (res.ok) {
                const blob = await res.blob();
                if (blob.size === 0) {
                    alert("The photo file is empty or missing.");
                    return;
                }
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            } else {
                alert("Could not load photo. It might have been deleted or not uploaded correctly.");
            }
        } catch (err) {
            console.error("Failed to view photo:", err);
            alert("Connection error. Please check your internet.");
        } finally {
            setPreviewLoading(false);
        }
    };

    const filteredDeliveries = deliveries.filter((d: DeliveryItem) =>
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
                                <TableHead>Proof</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeliveries.map((invoice: DeliveryItem) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell>{invoice.customer.name}</TableCell>
                                    <TableCell>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</TableCell>
                                    <TableCell>₹{invoice.totalAmount}</TableCell>
                                    <TableCell>{getStatusBadge(invoice.deliveryStatus || 'PENDING')}</TableCell>
                                    <TableCell>
                                        {invoice?.deliveryProof?.id ? (
                                            <button
                                                onClick={() => viewPhoto(invoice.id)}
                                                className="text-blue-600 hover:underline text-xs"
                                            >
                                                View Photo
                                            </button>
                                        ) : <span className="text-slate-400 text-xs">-</span>}
                                    </TableCell>
                                    <TableCell>
                                        {(invoice?.deliveryProof?.latitude && invoice?.deliveryProof?.longitude) ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${invoice.deliveryProof.latitude},${invoice.deliveryProof.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                            >
                                                <MapPin className="h-3 w-3" /> Map
                                            </a>
                                        ) : <span className="text-slate-400 text-xs">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {(!invoice.deliveryStatus || invoice.deliveryStatus === 'PENDING') && (
                                            <Button size="sm" onClick={() => handleVerifyClick(invoice)}>
                                                Verify Delivery
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredDeliveries.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8">No deliveries found.</TableCell></TableRow>}
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

            <Dialog open={!!previewUrl} onOpenChange={(open) => {
                if (!open && previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
            }}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none">
                    <DialogHeader className="p-4 bg-white/10 text-white border-b border-white/10">
                        <DialogTitle>Delivery Proof</DialogTitle>
                        <DialogDescription className="text-white/60">Verification photo with timestamp and location.</DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-auto min-h-[300px] flex items-center justify-center p-2">
                        {previewUrl && (
                            <img
                                src={previewUrl}
                                alt="Delivery Proof"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {previewLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium">Loading photo...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
