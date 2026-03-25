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
    Download,
    DollarSign,
    Clock,
    User
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    totalAmount: number;
    gstAmount: number;
    product: {
        name: string;
        company?: string;
        packing?: string;
        hsnCode?: string;
        gstRate: number;
    };
    batch?: {
        batchNumber: string;
        mrp?: number;
        salePrice?: number;
        ptr?: number;
        pts?: number;
        expiryDate?: string;
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
    paymentMethod: string;
    customer: {
        name: string;
        address: string;
        gstin?: string;
        phone?: string;
    };
    items: SaleItem[];
}

export default function ReceivablesPage() {
    const { token } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
    const [businessProfile, setBusinessProfile] = useState<any>(null);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrintRequest = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setSelectedInvoice(null),
    });

    useEffect(() => {
        if (token) {
            fetchReceivables();
            fetchBusinessProfile();
        }
    }, [token]);

    const fetchReceivables = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sales/receivables`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSales(data);
            }
        } catch (error) {
            console.error("Failed to fetch receivables:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusinessProfile = async () => {
        try {
            const [profileResponse, brandingResponse] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
            ]);
            const profileText = profileResponse.ok ? await profileResponse.text() : "";
            const profile = profileText ? JSON.parse(profileText) : null;
            const branding = brandingResponse.ok ? await brandingResponse.json() : null;
            if (profile || branding) {
                setBusinessProfile({
                    companyName: profile?.companyName || branding?.companyName || "",
                    address: profile?.address || "",
                    email: profile?.email || "",
                    phone: profile?.phone || "",
                    logoUrl: profile?.logoUrl || branding?.logoUrl || "",
                    gstin: profile?.gstin || "",
                    panNo: profile?.panNo || "",
                    dlNo: profile?.dlNo || "",
                    fssaiNo: profile?.fssaiNo || "",
                    bankName: profile?.bankName || "",
                    bankBranch: profile?.bankBranch || "",
                    bankAccountNo: profile?.bankAccountNo || "",
                    bankIfsc: profile?.bankIfsc || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch business profile:", error);
        }
    };

    const handlePrint = (sale: Sale) => {
        setSelectedInvoice(sale);
        setTimeout(() => handlePrintRequest(), 100);
    };

    const filteredSales = sales.filter(s =>
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalReceivable = filteredSales.reduce((acc, sale) => acc + sale.netAmount, 0);

    return (
        <RoleGate allowedRoles={["ADMIN", "ACCOUNTANT"]}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bills Receivable (Credit)</h1>
                        <p className="text-muted-foreground font-medium">Track outstanding credit payments from customers.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoice or customer..."
                                className="pl-9 h-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchReceivables} title="Refresh" className="h-10 w-10">
                            <Clock className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <DollarSign className="h-3 w-3" /> Total Outstanding
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-blue-800 font-mono">₹{totalReceivable.toLocaleString()}</div>
                            <CardDescription className="text-[10px] font-bold text-blue-400 uppercase mt-1">Across {filteredSales.length} Invoices</CardDescription>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-slate-200 overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="py-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Date</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Invoice #</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Customer</TableHead>
                                    <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-slate-500">Outstanding</TableHead>
                                    <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-slate-500 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium">
                                            No outstanding credit invoices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="text-slate-500 text-xs font-medium">
                                                {format(new Date(sale.createdAt), "dd MMM yyyy")}
                                                <div className="text-[10px] opacity-60 font-mono">{format(new Date(sale.createdAt), "HH:mm")}</div>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-slate-700 text-xs">
                                                {sale.invoiceNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{sale.customer.name}</p>
                                                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                                                            {sale.customer.address}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-slate-900 font-mono">
                                                ₹{sale.netAmount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePrint(sale)}
                                                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                                company: item.product.company,
                                packing: item.product.packing,
                                hsnCode: item.product.hsnCode,
                                batchNumber: item.batch?.batchNumber || "N/A",
                                expiryDate: item.batch?.expiryDate,
                                mrp: item.batch?.mrp || item.batch?.salePrice,
                                ptr: item.batch?.ptr,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                gstRate: item.product.gstRate,
                                gstAmount: item.gstAmount,
                                total: item.totalAmount
                            }))}
                            totals={{
                                subtotal: selectedInvoice.totalAmount,
                                gst: selectedInvoice.gstAmount,
                                discount: selectedInvoice.discountAmount,
                                net: selectedInvoice.netAmount
                            }}
                        />
                    )}
                </div>
            </div>
        </RoleGate>
    );
}
