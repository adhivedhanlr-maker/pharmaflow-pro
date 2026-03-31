"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleGate } from "@/components/auth/role-gate";
import { toast } from "sonner";
import { SettingsBreadcrumb } from "@/components/ui/settings-breadcrumb";
import {
    Download,
    Upload,
    FileSpreadsheet,
    Users,
    Truck,
    Package,
    ShoppingCart,
    ReceiptText,
    Database,
    Loader2,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ImportResult {
    created: number;
    skipped: number;
    errors: string[];
}

function downloadBlob(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function fetchExport(url: string, token: string, filename: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const buffer = await res.arrayBuffer();
        downloadBlob(buffer, filename);
        return true;
    } finally {
        clearTimeout(timeout);
    }
}

export default function DataManagementPage() {
    const { token } = useAuth();

    // Export loading states
    const [exporting, setExporting] = useState<string | null>(null);

    // Date range for invoices/purchases — default to current month
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const [invoiceFrom, setInvoiceFrom] = useState(monthStart);
    const [invoiceTo, setInvoiceTo] = useState(today);
    const [purchaseFrom, setPurchaseFrom] = useState(monthStart);
    const [purchaseTo, setPurchaseTo] = useState(today);

    // Import states
    const [importing, setImporting] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<Record<string, ImportResult>>({});
    const [showErrors, setShowErrors] = useState<Record<string, boolean>>({});
    const fileRefs = {
        customers: useRef<HTMLInputElement>(null),
        suppliers: useRef<HTMLInputElement>(null),
        products: useRef<HTMLInputElement>(null),
    };

    const handleExport = async (key: string, path: string, filename: string) => {
        setExporting(key);
        try {
            await fetchExport(`${API_BASE}/${path}`, token!, filename);
            toast.success(`${filename} downloaded`);
        } catch (e: any) {
            toast.error(e.message || "Export failed");
        } finally {
            setExporting(null);
        }
    };

    const handleImport = async (key: keyof typeof fileRefs, path: string) => {
        const file = fileRefs[key].current?.files?.[0];
        if (!file) {
            toast.error("Please select an Excel file first");
            return;
        }
        setImporting(key);
        setImportResult(prev => { const n = { ...prev }; delete n[key]; return n; });
        try {
            const formData = new FormData();
            formData.append("file", file);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);
            try {
                const res = await fetch(`${API_BASE}/${path}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Import failed");
                setImportResult(prev => ({ ...prev, [key]: data }));
                toast.success(`Import complete: ${data.created} added, ${data.skipped} skipped`);
            } finally {
                clearTimeout(timeout);
            }
        } catch (e: any) {
            toast.error(e.message || "Import failed");
        } finally {
            setImporting(null);
            if (fileRefs[key].current) fileRefs[key].current!.value = "";
        }
    };

    const invoiceQuery = [invoiceFrom && `from=${invoiceFrom}`, invoiceTo && `to=${invoiceTo}`].filter(Boolean).join("&");
    const purchaseQuery = [purchaseFrom && `from=${purchaseFrom}`, purchaseTo && `to=${purchaseTo}`].filter(Boolean).join("&");

    return (
        <RoleGate
            allowedRoles={["ADMIN"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">Only administrators can export or import data.</p>
                    <Button variant="outline" onClick={() => window.location.href = "/app"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6 max-w-3xl">
                <SettingsBreadcrumb crumbs={[
                    { label: "Settings", href: "/app/settings" },
                    { label: "Data Management" },
                ]} />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
                    <p className="text-muted-foreground">Export your data as Excel files for backup, or import data in bulk.</p>
                </div>

                {/* ── EXPORT ─────────────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-blue-600" />
                            Export Data
                        </CardTitle>
                        <CardDescription>
                            Download your data as Excel files. Use these for backup or offline analysis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Customers */}
                        <div className="flex items-center justify-between py-3 border-b">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">Customers</p>
                                    <p className="text-xs text-slate-500">Names, phones, GSTIN, balances</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={exporting === "customers"}
                                onClick={() => handleExport("customers", "export/customers", "customers.xlsx")}
                            >
                                {exporting === "customers" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                Download
                            </Button>
                        </div>

                        {/* Suppliers */}
                        <div className="flex items-center justify-between py-3 border-b">
                            <div className="flex items-center gap-3">
                                <Truck className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">Suppliers</p>
                                    <p className="text-xs text-slate-500">Names, phones, GSTIN, balances</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={exporting === "suppliers"}
                                onClick={() => handleExport("suppliers", "export/suppliers", "suppliers.xlsx")}
                            >
                                {exporting === "suppliers" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                Download
                            </Button>
                        </div>

                        {/* Stock */}
                        <div className="flex items-center justify-between py-3 border-b">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">Current Stock</p>
                                    <p className="text-xs text-slate-500">All batches with stock &gt; 0, MRP, expiry</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={exporting === "stock"}
                                onClick={() => handleExport("stock", "export/stock", "stock.xlsx")}
                            >
                                {exporting === "stock" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                Download
                            </Button>
                        </div>

                        {/* Invoices */}
                        <div className="py-3 border-b space-y-2">
                            <div className="flex items-center gap-3">
                                <ReceiptText className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">Invoices (Sales)</p>
                                    <p className="text-xs text-slate-500">Invoice headers + line items — filter by date range</p>
                                </div>
                            </div>
                            <div className="pl-8 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">From</p>
                                        <Input type="date" className="h-8 text-xs" value={invoiceFrom} onChange={e => setInvoiceFrom(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">To</p>
                                        <Input type="date" className="h-8 text-xs" value={invoiceTo} onChange={e => setInvoiceTo(e.target.value)} />
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" className="w-full" disabled={exporting === "invoices"}
                                    onClick={() => handleExport("invoices", `export/invoices${invoiceQuery ? `?${invoiceQuery}` : ""}`, "invoices.xlsx")}>
                                    {exporting === "invoices" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                    Download
                                </Button>
                            </div>
                        </div>

                        {/* Purchases */}
                        <div className="py-3 border-b space-y-2">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">Purchases</p>
                                    <p className="text-xs text-slate-500">Purchase bills + line items — filter by date range</p>
                                </div>
                            </div>
                            <div className="pl-8 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">From</p>
                                        <Input type="date" className="h-8 text-xs" value={purchaseFrom} onChange={e => setPurchaseFrom(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">To</p>
                                        <Input type="date" className="h-8 text-xs" value={purchaseTo} onChange={e => setPurchaseTo(e.target.value)} />
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" className="w-full" disabled={exporting === "purchases"}
                                    onClick={() => handleExport("purchases", `export/purchases${purchaseQuery ? `?${purchaseQuery}` : ""}`, "purchases.xlsx")}>
                                    {exporting === "purchases" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                    Download
                                </Button>
                            </div>
                        </div>

                        {/* All Data */}
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-blue-700">Full Backup (All Data)</p>
                                    <p className="text-xs text-slate-500">Customers, suppliers, stock, invoices, purchases — one file</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                disabled={exporting === "all"}
                                onClick={() => handleExport("all", "export/all", "pharmaflow-backup.xlsx")}
                            >
                                {exporting === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                                Download All
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── IMPORT ─────────────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-green-600" />
                            Import Data
                        </CardTitle>
                        <CardDescription>
                            Upload an Excel file to add data in bulk. Download the template first to see the required format.
                            Existing records with the same name are skipped (not overwritten).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">

                        {(["customers", "suppliers", "products"] as const).map((key) => {
                            const config = {
                                customers: {
                                    label: "Customers",
                                    icon: <Users className="h-5 w-5 text-slate-400" />,
                                    hint: "Name, Phone, GSTIN, Address, Drug License, Credit Limit",
                                    templatePath: "export/template/customers",
                                    importPath: "export/import/customers",
                                    templateFile: "customers-template.xlsx",
                                },
                                suppliers: {
                                    label: "Suppliers",
                                    icon: <Truck className="h-5 w-5 text-slate-400" />,
                                    hint: "Name, Phone, GSTIN, Address",
                                    templatePath: "export/template/suppliers",
                                    importPath: "export/import/suppliers",
                                    templateFile: "suppliers-template.xlsx",
                                },
                                products: {
                                    label: "Products & Opening Stock",
                                    icon: <Package className="h-5 w-5 text-slate-400" />,
                                    hint: "Product Name, Company, Batch, Expiry, Stock, MRP, PTR, PTS, Purchase Price",
                                    templatePath: "export/template/products",
                                    importPath: "export/import/products",
                                    templateFile: "products-template.xlsx",
                                },
                            }[key];

                            const result = importResult[key];

                            return (
                                <div key={key} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        {config.icon}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{config.label}</p>
                                            <p className="text-xs text-slate-500 truncate">{config.hint}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs text-blue-600 shrink-0"
                                            onClick={() => handleExport(`tmpl_${key}`, config.templatePath, config.templateFile)}
                                            disabled={exporting === `tmpl_${key}`}
                                        >
                                            {exporting === `tmpl_${key}` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileSpreadsheet className="h-3 w-3 mr-1" />}
                                            Template
                                        </Button>
                                    </div>

                                    <div className="flex gap-2">
                                        <Input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            ref={fileRefs[key]}
                                            className="text-xs h-9 flex-1"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0"
                                            disabled={importing === key}
                                            onClick={() => handleImport(key, config.importPath)}
                                        >
                                            {importing === key ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                                            Import
                                        </Button>
                                    </div>

                                    {result && (
                                        <div className={`rounded-md p-3 text-sm ${result.errors.length === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                                            <div className="flex items-center gap-2 font-medium">
                                                {result.errors.length === 0
                                                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    : <XCircle className="h-4 w-4 text-amber-600" />
                                                }
                                                <span>{result.created} added · {result.skipped} skipped</span>
                                                {result.errors.length > 0 && (
                                                    <button
                                                        className="ml-auto text-xs text-amber-700 flex items-center gap-1"
                                                        onClick={() => setShowErrors(p => ({ ...p, [key]: !p[key] }))}
                                                    >
                                                        {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                                                        {showErrors[key] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    </button>
                                                )}
                                            </div>
                                            {showErrors[key] && result.errors.length > 0 && (
                                                <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc list-inside">
                                                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </RoleGate>
    );
}
