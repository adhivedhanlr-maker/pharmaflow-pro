"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, MapPin, Eye, Loader2, X, User } from "lucide-react";
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
    rep?: { name: string };
    createdAt: string;
}

export default function DeliveriesPage() {
    const { token, user } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [verificationOpen, setVerificationOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; customerName: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
    const [assigningSaleId, setAssigningSaleId] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    useEffect(() => {
        if (token) {
            fetchDeliveries();
            if (user?.role === 'ADMIN') {
                fetchReps();
            }
        }

        const socket = io(API_BASE);
        socket.on('new-invoice', () => fetchDeliveries());

        return () => {
            socket.disconnect();
        };
    }, [token, user]);

    const fetchReps = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReps(data.filter((u: any) => u.role === 'SALES_REP'));
            }
        } catch (err) {
            console.error("Failed to fetch reps:", err);
        }
    };

    const assignRep = async (saleId: string, repId: string) => {
        try {
            const res = await fetch(`${API_BASE}/sales/${saleId}/assign-rep`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ repId })
            });
            if (res.ok) {
                setAssigningSaleId(null);
                fetchDeliveries();
            }
        } catch (err) {
            console.error("Failed to assign rep:", err);
        }
    };

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

    const pendingDeliveries = filteredDeliveries.filter(d => d.deliveryStatus === 'PENDING');
    const verifiedDeliveries = filteredDeliveries.filter(d => d.deliveryStatus === 'DELIVERED');

    const DeliveryTable = ({ data, showAction = true }: { data: DeliveryItem[], showAction?: boolean }) => (
        <Table className="min-w-[900px]">
            <TableHeader>
                <TableRow className="bg-slate-50/30">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Assigned Rep</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Location</TableHead>
                    {showAction && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((invoice: DeliveryItem) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customer.name}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{invoice.rep?.name || "Unassigned"}</span>
                                {showAction && user?.role === 'ADMIN' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                        onClick={() => setAssigningSaleId(invoice.id)}
                                    >
                                        <User className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</TableCell>
                        <TableCell>₹{invoice.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(invoice.deliveryStatus || 'PENDING')}</TableCell>
                        <TableCell>
                            {invoice?.deliveryProof?.id ? (
                                <button
                                    onClick={() => viewPhoto(invoice.id)}
                                    className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                >
                                    <Eye className="h-3 w-3" /> View Photo
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
                        {showAction && (
                            <TableCell className="text-right">
                                {invoice.deliveryStatus === 'PENDING' && (
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" onClick={() => handleVerifyClick(invoice)}>
                                            Verify
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

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

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="pending">
                        Pending Deliveries ({pendingDeliveries.length})
                    </TabsTrigger>
                    <TabsTrigger value="verified">
                        Verified History ({verifiedDeliveries.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 py-3">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Items Awaiting Delivery</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {pendingDeliveries.length > 0 ? (
                                <DeliveryTable data={pendingDeliveries} />
                            ) : (
                                <div className="text-center py-12 text-slate-500">No pending deliveries.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="verified" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 py-3">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Successfully Verified</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {verifiedDeliveries.length > 0 ? (
                                <DeliveryTable data={verifiedDeliveries} showAction={false} />
                            ) : (
                                <div className="text-center py-12 text-slate-500">No verification history yet.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!assigningSaleId} onOpenChange={(open) => !open && setAssigningSaleId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Sales Representative</DialogTitle>
                        <DialogDescription>
                            Assign a sales rep to handle this delivery.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Select onValueChange={(val) => assigningSaleId && assignRep(assigningSaleId, val)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a Sales Rep" />
                            </SelectTrigger>
                            <SelectContent>
                                {reps.map(rep => (
                                    <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                // Auto-delegate logic placeholder
                                // For now just pick first available rep or log it
                                if (reps.length > 0) {
                                    assignRep(assigningSaleId!, reps[0].id);
                                }
                            }}
                        >
                            Auto Delegate (Nearest On-Duty Rep)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
                <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/98 border-none shadow-2xl">
                    <DialogHeader className="p-4 bg-slate-900 text-white border-b border-white/10 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-white">Delivery Proof</DialogTitle>
                            <DialogDescription className="text-slate-400">Verification photo with timestamp and location.</DialogDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (previewUrl) URL.revokeObjectURL(previewUrl);
                                setPreviewUrl(null);
                            }}
                            className="text-white hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
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
