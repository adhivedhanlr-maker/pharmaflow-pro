"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Eye, Loader2, Printer, Search, AlertCircle, CheckCircle2, ArrowLeftRight, RefreshCw, FilePlus2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generatePdfFromElement, printInvoiceNewWindow } from "@/lib/print-invoice";
import { useAuth } from "@/context/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;
const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
};

interface NotePreviewRow {
    product: string;
    batch: string;
    qty: number;
    returnQty: number;
    unitPrice: number;
    reason: string;
}

interface NotePreview {
    title: string;
    documentLabel: string;
    documentNumber: string;
    counterpartyLabel: string;
    counterpartyName: string;
    date: string | Date | null | undefined;
    qtyColumnLabel: string;
    priceColumnLabel: string;
    total: number;
    rows: NotePreviewRow[];
    statusLabel: string;
}

function NoteDocument({ preview }: { preview: NotePreview }) {
    return (
        <div className="bg-white p-8 text-black" style={{ width: "210mm" }}>
            <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{preview.title}</p>
                <h2 className="mt-3 text-3xl font-bold">{preview.title}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-700 mb-8">
                <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-slate-500 uppercase text-[10px] tracking-[0.25em]">{preview.documentLabel}</p>
                    <p className="mt-2 text-base font-semibold">{preview.documentNumber}</p>
                    <p className="mt-1 text-slate-500">{formatDate(preview.date)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-slate-500 uppercase text-[10px] tracking-[0.25em]">{preview.counterpartyLabel}</p>
                    <p className="mt-2 text-base font-semibold">{preview.counterpartyName || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-slate-500 uppercase text-[10px] tracking-[0.25em]">Return Status</p>
                    <p className="mt-2 text-base font-semibold">{preview.statusLabel}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-separate border-spacing-0 text-sm text-slate-700">
                    <thead>
                        <tr className="bg-slate-100 text-left text-sm text-slate-700">
                            <th className="border border-slate-200 px-3 py-2">Product</th>
                            <th className="border border-slate-200 px-3 py-2">Batch</th>
                            <th className="border border-slate-200 px-3 py-2 text-right">{preview.qtyColumnLabel}</th>
                            <th className="border border-slate-200 px-3 py-2 text-right">Return Qty</th>
                            <th className="border border-slate-200 px-3 py-2 text-right">{preview.priceColumnLabel}</th>
                            <th className="border border-slate-200 px-3 py-2">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.rows.map((row, index) => (
                            <tr key={index} className="odd:bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-3 py-2">{row.product}</td>
                                <td className="border border-slate-200 px-3 py-2 font-mono text-xs">{row.batch}</td>
                                <td className="border border-slate-200 px-3 py-2 text-right">{row.qty}</td>
                                <td className="border border-slate-200 px-3 py-2 text-right">{row.returnQty}</td>
                                <td className="border border-slate-200 px-3 py-2 text-right">{formatCurrency(row.unitPrice)}</td>
                                <td className="border border-slate-200 px-3 py-2">{row.reason || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-700">
                <div>Prepared on {formatDate(new Date())}</div>
                <div className="text-base font-semibold">Total Return Amount: {formatCurrency(preview.total)}</div>
            </div>
        </div>
    );
}

export default function ReturnsPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("sales");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [transaction, setTransaction] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [salesReturnType, setSalesReturnType] = useState<'DAMAGED' | 'EXPIRED' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement | null>(null);

    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [debitNotes, setDebitNotes] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPreview, setHistoryPreview] = useState<NotePreview | null>(null);
    const historyPrintRef = useRef<HTMLDivElement | null>(null);

    const startNewReturn = () => {
        setTransaction(null);
        setReturnItems([]);
        setSalesReturnType(null);
        setError(null);
        setSuccess(null);
        setSearchQuery("");
    };

    useEffect(() => {
        startNewReturn();
    }, [activeTab]);

    const fetchCreditNotes = async () => {
        if (!token) return;
        setHistoryLoading(true);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${API_BASE}/returns/credit-notes`, {
                signal: controller.signal,
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                setCreditNotes(await response.json());
            } else {
                toast.error("Failed to load credit note history.");
            }
        } catch (caught) {
            const err = caught as any;
            toast.error(err?.name === "AbortError" ? "Loading credit notes timed out." : "Network error loading credit notes.");
        } finally {
            window.clearTimeout(timeoutId);
            setHistoryLoading(false);
        }
    };

    const fetchDebitNotes = async () => {
        if (!token) return;
        setHistoryLoading(true);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${API_BASE}/returns/debit-notes`, {
                signal: controller.signal,
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                setDebitNotes(await response.json());
            } else {
                toast.error("Failed to load debit note history.");
            }
        } catch (caught) {
            const err = caught as any;
            toast.error(err?.name === "AbortError" ? "Loading debit notes timed out." : "Network error loading debit notes.");
        } finally {
            window.clearTimeout(timeoutId);
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        if (activeTab === "sales") {
            fetchCreditNotes();
        } else {
            fetchDebitNotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, token]);

    const itemsToReturn = useMemo(
        () => returnItems.filter((item) => item.returnQuantity > 0),
        [returnItems]
    );

    const totalReturnAmount = useMemo(
        () => itemsToReturn.reduce((sum, item) => sum + item.returnQuantity * (item.unitPrice || item.purchasePrice || 0), 0),
        [itemsToReturn]
    );

    const noteTitle = activeTab === "sales" ? "Credit Note" : "Debit Note";
    const documentLabel = activeTab === "sales" ? "Invoice" : "Bill";
    const documentNumber = transaction?.invoiceNumber || transaction?.billNumber || "";
    const counterpartyLabel = activeTab === "sales" ? "Customer" : "Supplier";
    const counterpartyName = activeTab === "sales" ? transaction?.customer?.name : transaction?.supplier?.name;

    const draftPreview: NotePreview | null = useMemo(() => {
        if (!transaction) return null;
        return {
            title: noteTitle,
            documentLabel,
            documentNumber,
            counterpartyLabel,
            counterpartyName,
            date: transaction?.date || transaction?.createdAt,
            qtyColumnLabel: activeTab === "sales" ? "Sold Qty" : "Purchased Qty",
            priceColumnLabel: activeTab === "sales" ? "Unit Price" : "Purchase Price",
            total: totalReturnAmount,
            statusLabel: itemsToReturn.length > 0 ? `${itemsToReturn.length} item${itemsToReturn.length === 1 ? "" : "s"}` : "Draft",
            rows: returnItems.map((item) => ({
                product: item.batch?.product?.name || "-",
                batch: item.batch?.batchNumber || "-",
                qty: item.quantity,
                returnQty: item.returnQuantity,
                unitPrice: activeTab === "sales" ? item.unitPrice ?? 0 : item.purchasePrice ?? 0,
                reason: item.reason || (activeTab === "sales" && salesReturnType ? (salesReturnType === "DAMAGED" ? "Damaged Return" : "Expired Return") : "-"),
            })),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaction, returnItems, activeTab, salesReturnType, totalReturnAmount, itemsToReturn.length]);

    const buildPreviewFromHistory = (kind: "credit" | "debit", note: any): NotePreview => {
        if (kind === "credit") {
            const rows: NotePreviewRow[] = (note.items || []).map((item: any) => ({
                product: item.saleItem?.product?.name || "-",
                batch: item.saleItem?.batch?.batchNumber || "-",
                qty: item.saleItem?.quantity ?? 0,
                returnQty: item.quantity,
                unitPrice: item.saleItem?.unitPrice ?? 0,
                reason: item.reason || "-",
            }));
            return {
                title: "Credit Note",
                documentLabel: "Invoice",
                documentNumber: note.sale?.invoiceNumber || "-",
                counterpartyLabel: "Customer",
                counterpartyName: note.sale?.customer?.name || "-",
                date: note.date,
                qtyColumnLabel: "Sold Qty",
                priceColumnLabel: "Unit Price",
                total: note.totalAmount ?? 0,
                statusLabel: `${rows.length} item${rows.length === 1 ? "" : "s"}`,
                rows,
            };
        }

        const rows: NotePreviewRow[] = (note.items || []).map((item: any) => ({
            product: item.purchaseItem?.product?.name || "-",
            batch: item.purchaseItem?.batch?.batchNumber || "-",
            qty: item.purchaseItem?.quantity ?? 0,
            returnQty: item.quantity,
            unitPrice: item.purchaseItem?.purchasePrice ?? 0,
            reason: item.reason || "-",
        }));
        return {
            title: "Debit Note",
            documentLabel: "Bill",
            documentNumber: note.purchase?.billNumber || "-",
            counterpartyLabel: "Supplier",
            counterpartyName: note.purchase?.supplier?.name || "-",
            date: note.date,
            qtyColumnLabel: "Purchased Qty",
            priceColumnLabel: "Purchase Price",
            total: note.totalAmount ?? 0,
            statusLabel: `${rows.length} item${rows.length === 1 ? "" : "s"}`,
            rows,
        };
    };

    const resetTransaction = () => {
        setTransaction(null);
        setReturnItems([]);
        setSalesReturnType(null);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError(`Please enter an ${documentLabel.toLowerCase()} number`);
            return;
        }

        setLoading(true);
        setError(null);
        resetTransaction();

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);

        try {
            const endpoint = activeTab === "sales"
                ? `/returns/sales/${encodeURIComponent(searchQuery.trim())}`
                : `/returns/purchase/${encodeURIComponent(searchQuery.trim())}`;
            const response = await fetch(`${API_BASE}${endpoint}`, {
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                setError(`${documentLabel} not found`);
                return;
            }

            const data = await response.json();
            setTransaction(data);
            setReturnItems(data.items.map((item: any) => ({
                ...item,
                returnQuantity: 0,
                reason: "",
            })));
        } catch (caught) {
            const error = caught as any;
            if (error.name === "AbortError") {
                setError("Request timed out. Please try again.");
            } else {
                setError("Network error. Please try again.");
            }
        } finally {
            window.clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const updateReturnQuantity = (index: number, quantity: number) => {
        const updated = [...returnItems];
        const max = updated[index].availableQuantity ?? updated[index].quantity;
        updated[index].returnQuantity = Math.max(0, Math.min(quantity, max));
        setReturnItems(updated);
    };

    const updateReason = (index: number, reason: string) => {
        const updated = [...returnItems];
        updated[index].reason = reason;
        setReturnItems(updated);
    };

    const handleSubmitReturn = async () => {
        const items = returnItems.filter((item) => item.returnQuantity > 0);

        if (items.length === 0) {
            setError("Please select at least one item to return");
            return;
        }

        if (activeTab === "purchase") {
            for (const item of items) {
                if (!item.reason.trim()) {
                    setError("Please provide a reason for all items being returned");
                    return;
                }
            }
        }

        setLoading(true);
        setError(null);

        try {
            const endpoint = activeTab === "sales" ? "/returns/sales" : "/returns/purchase";
            const payload = activeTab === "sales"
                ? {
                    saleId: transaction.id,
                    returnType: salesReturnType,
                    items: items.map((item) => ({
                        saleItemId: item.id,
                        quantity: item.returnQuantity,
                        reason: item.reason || (salesReturnType === "DAMAGED" ? "Damaged Return" : salesReturnType === "EXPIRED" ? "Expired Return" : ""),
                    })),
                }
                : {
                    purchaseId: transaction.id,
                    items: items.map((item) => ({
                        purchaseItemId: item.id,
                        quantity: item.returnQuantity,
                        reason: item.reason,
                    })),
                };

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const responseBody = await response.json().catch(() => null);
                setError(responseBody?.message || "Failed to process return");
                return;
            }

            setSuccess(`${noteTitle} created successfully! Use Print or Download PDF below, or find it later under the history table.`);
            setSearchQuery("");
            if (activeTab === "sales") {
                fetchCreditNotes();
            } else {
                fetchDebitNotes();
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!printRef.current || !transaction) {
            toast.error("Nothing to print.");
            return;
        }

        printInvoiceNewWindow(
            printRef.current,
            `${noteTitle} - ${documentNumber}`,
            counterpartyName,
            true
        );
    };

    const handlePDFDownload = async () => {
        if (!printRef.current || !transaction) {
            toast.error("Nothing to export.");
            return;
        }

        try {
            await generatePdfFromElement(
                printRef.current,
                `${noteTitle.replace(" ", "_")}_${documentNumber || Date.now()}.pdf`
            );
            toast.success("PDF download started.");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Unable to generate PDF. Please try again.");
        }
    };

    const handleHistoryView = (kind: "credit" | "debit", note: any) => {
        const preview = buildPreviewFromHistory(kind, note);
        setHistoryPreview(preview);
        window.setTimeout(() => {
            if (historyPrintRef.current) {
                printInvoiceNewWindow(historyPrintRef.current, `${preview.title} - ${preview.documentNumber}`, preview.counterpartyName, false);
            }
            setHistoryPreview(null);
        }, 200);
    };

    const handleHistoryPrint = (kind: "credit" | "debit", note: any) => {
        const preview = buildPreviewFromHistory(kind, note);
        setHistoryPreview(preview);
        window.setTimeout(() => {
            if (historyPrintRef.current) {
                printInvoiceNewWindow(historyPrintRef.current, `${preview.title} - ${preview.documentNumber}`, preview.counterpartyName, true);
            }
            setHistoryPreview(null);
        }, 200);
    };

    const handleHistoryDownload = (kind: "credit" | "debit", note: any) => {
        const preview = buildPreviewFromHistory(kind, note);
        setHistoryPreview(preview);
        window.setTimeout(async () => {
            try {
                if (historyPrintRef.current) {
                    await generatePdfFromElement(
                        historyPrintRef.current,
                        `${preview.title.replace(" ", "_")}_${preview.documentNumber || Date.now()}.pdf`
                    );
                    toast.success("PDF download started.");
                }
            } catch (error) {
                console.error("PDF generation failed:", error);
                toast.error("Unable to generate PDF. Please try again.");
            } finally {
                setHistoryPreview(null);
            }
        }, 200);
    };

    const renderActionButtons = () => (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button onClick={handlePDFDownload} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
            </Button>
        </div>
    );

    const renderReturnTable = () => (
        <Table className="min-w-[600px]">
            <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">{activeTab === "sales" ? "Sold Qty" : "Purchased Qty"}</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead className="text-right">{activeTab === "sales" ? "Unit Price" : "Purchase Price"}</TableHead>
                    <TableHead>Reason</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {returnItems.map((item, index) => {
                    const availableQuantity = item.availableQuantity ?? item.quantity;
                    return (
                    <TableRow key={item.id}>
                        <TableCell>{item.batch?.product?.name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batch?.batchNumber}</TableCell>
                        <TableCell className="text-right">
                            {item.quantity}
                            {item.returnedQuantity > 0 && (
                                <div className="text-[10px] text-amber-600">{item.returnedQuantity} already returned</div>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <Input
                                type="number"
                                className="h-8 w-20 ml-auto text-right"
                                value={item.returnQuantity}
                                max={availableQuantity}
                                min={0}
                                disabled={availableQuantity <= 0}
                                onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value, 10) || 0)}
                            />
                            {availableQuantity <= 0 && (
                                <div className="text-[10px] text-muted-foreground">Fully returned</div>
                            )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(activeTab === "sales" ? item.unitPrice ?? 0 : item.purchasePrice ?? 0)}
                        </TableCell>
                        <TableCell>
                            <Input
                                placeholder={activeTab === "sales" ? (salesReturnType ? (salesReturnType === "DAMAGED" ? "Damaged Return" : "Expired Return") : "Reason...") : "Reason..."}
                                className="h-8"
                                value={item.reason}
                                onChange={(e) => updateReason(index, e.target.value)}
                            />
                        </TableCell>
                    </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );

    const renderHistoryTable = (kind: "credit" | "debit") => {
        const notes = kind === "credit" ? creditNotes : debitNotes;
        const documentLabelForKind = kind === "credit" ? "Invoice #" : "Bill #";
        const counterpartyLabelForKind = kind === "credit" ? "Customer" : "Supplier";
        const noteTitleForKind = kind === "credit" ? "Credit Note" : "Debit Note";

        if (historyLoading) {
            return (
                <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            );
        }

        if (notes.length === 0) {
            return (
                <div className="p-10 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                    <p>No {noteTitleForKind.toLowerCase()}s yet.</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>{documentLabelForKind}</TableHead>
                            <TableHead>{counterpartyLabelForKind}</TableHead>
                            <TableHead className="text-right">Items</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right w-[110px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {notes.map((note) => {
                            const docNumber = kind === "credit" ? note.sale?.invoiceNumber : note.purchase?.billNumber;
                            const partyName = kind === "credit" ? note.sale?.customer?.name : note.purchase?.supplier?.name;
                            return (
                                <TableRow key={note.id}>
                                    <TableCell className="text-muted-foreground text-xs">{formatDate(note.date)}</TableCell>
                                    <TableCell className="font-mono font-medium">{docNumber || "-"}</TableCell>
                                    <TableCell>{partyName || "-"}</TableCell>
                                    <TableCell className="text-right">{note.items?.length ?? 0}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(note.totalAmount ?? 0)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <Button variant="ghost" size="sm" onClick={() => handleHistoryView(kind, note)} className="h-8 w-8 p-0" title={`View ${noteTitleForKind}`}>
                                                <Eye className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleHistoryPrint(kind, note)} className="h-8 w-8 p-0" title="Print">
                                                <Printer className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleHistoryDownload(kind, note)} className="h-8 w-8 p-0" title="Download PDF">
                                                <Download className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Returns & Reversals</h1>
                    <p className="text-muted-foreground">Process sales returns (Credit Notes) and purchase returns (Debit Notes).</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {transaction && renderActionButtons()}
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>{success}</span>
                        <Button size="sm" variant="outline" onClick={startNewReturn} className="w-full sm:w-auto bg-white">
                            <FilePlus2 className="mr-2 h-4 w-4" />
                            Start New Return
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                    <TabsTrigger value="sales">Sales Returns</TabsTrigger>
                    <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Enter ${documentLabel} Number...`}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Find Transaction
                    </Button>
                </div>

                <TabsContent value="sales" className="space-y-6">
                    {transaction ? (
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <span className="flex items-center">
                                        <RefreshCw className="mr-2 h-5 w-5 text-blue-600" />
                                        Sales Return - {transaction.invoiceNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground font-normal">Customer: {counterpartyName}</span>
                                </CardTitle>
                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-slate-600 font-medium">Sales Return Type:</span>
                                    <Button size="sm" variant={salesReturnType === "DAMAGED" ? "default" : "outline"} onClick={() => setSalesReturnType("DAMAGED")}>Damaged Return</Button>
                                    <Button size="sm" variant={salesReturnType === "EXPIRED" ? "default" : "outline"} onClick={() => setSalesReturnType("EXPIRED")}>Expired Return</Button>
                                    <span className="text-xs text-muted-foreground">Damaged / expired returns will not add stock back.</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                {renderReturnTable()}
                                <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <div className="text-lg font-bold">Total Return Amount: <span className="text-red-600">{formatCurrency(totalReturnAmount)}</span></div>
                                    {renderActionButtons()}
                                    <Button onClick={handleSubmitReturn} disabled={loading || !!success} className="w-full sm:w-auto">
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Process Credit Note
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter an invoice number above to load items for return.</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                Credit Note History
                                <Button variant="ghost" size="sm" onClick={fetchCreditNotes} className="h-8 w-8 p-0" title="Refresh">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {renderHistoryTable("credit")}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="purchase" className="space-y-6">
                    {transaction ? (
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <span className="flex items-center">
                                        <ArrowLeftRight className="mr-2 h-5 w-5 text-orange-600" />
                                        Purchase Return - {transaction.billNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground font-normal">Supplier: {counterpartyName}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                {renderReturnTable()}
                                <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <div className="text-lg font-bold">Total Return Amount: <span className="text-red-600">{formatCurrency(totalReturnAmount)}</span></div>
                                    {renderActionButtons()}
                                    <Button onClick={handleSubmitReturn} disabled={loading || !!success} className="w-full sm:w-auto">
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Process Debit Note
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter a purchase bill number above to load items for return.</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                Debit Note History
                                <Button variant="ghost" size="sm" onClick={fetchDebitNotes} className="h-8 w-8 p-0" title="Refresh">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {renderHistoryTable("debit")}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div ref={printRef} className="pointer-events-none opacity-0 absolute left-[-9999px] top-0 w-[210mm]" aria-hidden="true">
                {draftPreview && <NoteDocument preview={draftPreview} />}
            </div>

            <div ref={historyPrintRef} className="pointer-events-none opacity-0 absolute left-[-9999px] top-0 w-[210mm]" aria-hidden="true">
                {historyPreview && <NoteDocument preview={historyPreview} />}
            </div>
        </div>
    );
}
