"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import {
    Search,
    Printer,
    FileText,
    Loader2,
    Calendar,
    Download
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import { InvoicePrint } from "@/components/billing/invoice-print";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface SaleItem {
    id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number; // This is line total (qty * price)
    gstAmount: number;
    product: {
        name: string;
        gstRate: number;
    };
    batch?: {
        batchNumber: string;
    };
}

interface Sale {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    totalAmount: number;
    gstAmount: number;
    netAmount: number;
    discountAmount: number;
    isCash: boolean;
    customer: {
        name: string;
        address: string;
        gstin?: string;
        phone?: string;
    };
    items: SaleItem[];
}

export default function SalesHistoryPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
    const [businessProfile, setBusinessProfile] = useState<any>(null);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrintRequest = useReactToPrint({
        content: () => printRef.current,
        onAfterPrint: () => setSelectedInvoice(null), // Clear selection after print
    });

    useEffect(() => {
        if (token) {
            fetchSales();
            fetchBusinessProfile();
        }
    }, [token]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sales/invoices`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Ensure recent first
                setSales(data.sort((a: Sale, b: Sale) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
        } catch (error) {
            console.error("Failed to fetch sales history:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusinessProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/business-profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setBusinessProfile(await response.json());
            }
        } catch (error) {
            console.error("Failed to fetch business profile:", error);
        }
    };

    const handlePrint = (sale: Sale) => {
        setSelectedInvoice(sale);
        // Small timeout to allow state to update and render the hidden component before printing
        setTimeout(() => {
            handlePrintRequest();
        }, 100);
    };

    const filteredSales = sales.filter(s =>
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <RoleGate allowedRoles={["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT"]}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales History</h1>
                        <p className="text-muted-foreground">View and manage past invoices.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoice or customer..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchSales} title="Refresh">
                            <Calendar className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No invoices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}
                                            </TableCell>
                                            <TableCell className="font-mono font-medium">
                                                {sale.invoiceNumber}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {sale.customer.name}
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                    {sale.customer.address}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={sale.isCash ? "default" : "secondary"} className="text-[10px]">
                                                    {sale.isCash ? "CASH" : "CREDIT"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">
                                                ₹{sale.netAmount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handlePrint(sale)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Printer className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Hidden Print Container */}
                <div style={{ display: "none" }}>
                    {selectedInvoice && (
                        <InvoicePrint
                            ref={printRef}
                            invoiceNumber={selectedInvoice.invoiceNumber}
                            date={new Date(selectedInvoice.createdAt)}
                            businessProfile={businessProfile}
                            customer={selectedInvoice.customer}
                            items={selectedInvoice.items.map(item => ({
                                id: item.id,
                                name: item.product.name,
                                batchNumber: item.batch?.batchNumber || "N/A",
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                gstRate: item.product.gstRate,
                                gstAmount: item.gstAmount,
                                total: item.totalAmount // This is line total
                            }))}
                            totals={{
                                subtotal: selectedInvoice.totalAmount, // This is pre-tax total in backend
                                gst: selectedInvoice.gstAmount,
                                net: selectedInvoice.netAmount
                            }}
                        />
                    )}
                </div>
            </div>
        </RoleGate>
    );
}
