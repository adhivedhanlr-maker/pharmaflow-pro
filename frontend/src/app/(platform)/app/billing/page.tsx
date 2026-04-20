"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { flushSync } from "react-dom";
import { printOnPage } from "@/lib/print-invoice";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Printer, Loader2, ShoppingCart, ShieldAlert, Camera, Eye, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoicePrint } from "@/components/billing/invoice-print";
import { CustomerDialog } from "@/components/billing/customer-dialog";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { BarcodeScanner } from "@/components/barcode/barcode-scanner";
import { cn } from "@/lib/utils";

interface BillingItem {
    id: string;
    productId: string;
    name: string;
    company?: string;
    packing?: string;
    hsnCode?: string;
    batchId: string;
    batchNumber: string;
    expiryDate?: string;
    quantity: number;
    freeQuantity: number;
    mrp?: number;
    ptr?: number;
    pts?: number;
    unitPrice: number;
    discountPct?: number;
    gstRate: number;
    gstAmount: number;
    total: number;
}

interface Product {
    id: string;
    name: string;
    company?: string;
    packing?: string;
    hsnCode?: string;
    gstRate: number;
    batches: Batch[];
}

interface Batch {
    id: string;
    batchNumber: string;
    currentStock: number;
    salePrice: number;
    ptr?: number;
    pts?: number;
    mrp?: number;
    expiryDate: string;
    supplier?: { id: string; name: string } | null;
}

interface Customer {
    id: string;
    name: string;
    gstin?: string;
    address?: string;
    phone?: string;
    email?: string;
    state?: string;
    dlNo?: string;
    fssaiNo?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const BILLING_DRAFT_STORAGE_KEY = "billing_draft_v1";

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
            <BillingContent />
        </Suspense>
    );
}

function BillingContent() {
    const { token, user } = useAuth();
    const canAccess = useMemo(() => {
        if (!user) return false;
        if (user.role === "ADMIN" || user.role === "BILLING_OPERATOR" || user.role === "ACCOUNTANT") return true;
        if (user.role === "SALES_REP") return !!user.canGenerateInvoice;
        return false;
    }, [user]);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [items, setItems] = useState<BillingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCash, setIsCash] = useState(true);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [productSearch, setProductSearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [customerType, setCustomerType] = useState<"PHARMACY" | "DISTRIBUTOR">("PHARMACY");
    const [extraDiscount, setExtraDiscount] = useState(0);
    const printRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("");
    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState("");
    const [savedInvoiceDialog, setSavedInvoiceDialog] = useState<{
        invoiceNumber: string;
        customer: { name: string; address: string; gstin?: string; phone?: string; email?: string; state?: string; dlNo?: string; fssaiNo?: string };
        snapshotItems: BillingItem[];
        snapshotTotals: { subtotal: number; gst: number; discount: number; net: number };
        snapshotPaymentMethod: string;
        snapshotCustomerType: "PHARMACY" | "DISTRIBUTOR";
    } | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const savedDraft = localStorage.getItem(BILLING_DRAFT_STORAGE_KEY);
        if (!savedDraft) return;

        try {
            const draft = JSON.parse(savedDraft);
            setSelectedCustomerId(draft.selectedCustomerId || "");
            setItems(Array.isArray(draft.items) ? draft.items : []);
            setPaymentMethod(draft.paymentMethod || "CASH");
            setCustomerType(draft.customerType === "DISTRIBUTOR" ? "DISTRIBUTOR" : "PHARMACY");
            setExtraDiscount(typeof draft.extraDiscount === "number" ? draft.extraDiscount : 0);
        } catch (error) {
            console.error("Failed to restore billing draft:", error);
        }
    }, []);

    useEffect(() => {
        const customerId = searchParams.get("customerId");
        if (customerId) setSelectedCustomerId(customerId);
    }, [searchParams]);

    useEffect(() => {
        if (token) {
            void fetchCustomers();
            void fetchBusinessProfile();
            void fetchNextInvoiceNumber();
        }
    }, [token]);

    const fetchNextInvoiceNumber = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(`${API_BASE}/sales/next-invoice-number`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
                const data = await res.json();
                setNextInvoiceNumber(data.nextNumber ?? "");
            }
        } catch {
            // non-critical — silently ignore
        }
    };

    const fetchBusinessProfile = async () => {
        try {
            const [profileResponse, brandingResponse] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
            ]);

            const profileText = profileResponse.ok ? await profileResponse.text() : "";
            const profile = profileText ? JSON.parse(profileText) : null;
            const branding = brandingResponse.ok ? await brandingResponse.json() : null;

            setBusinessProfile({
                companyName: profile?.companyName || branding?.companyName || "",
                address: profile?.address || "Address not configured",
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
                showLogo: profile?.showLogo ?? true,
                paymentQrUrl: profile?.paymentQrUrl || null,
                paymentUpiString: profile?.paymentUpiString || null,
                showPaymentQr: profile?.showPaymentQr ?? true,
            });
        } catch (error) {
            console.error("Failed to fetch business profile:", error);
        }
    };

    const fetchCustomers = async (search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            params.append("take", "100");

            const custRes = await fetch(`${API_BASE}/parties/customers?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (custRes.ok) {
                const data = await custRes.json();
                setCustomers(data.data || data);
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async (search = "") => {
        setLoadingProducts(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            params.append("take", "50");
            params.append("onlyWithStock", "true");

            const prodRes = await fetch(`${API_BASE}/inventory/products?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (prodRes.ok) {
                const data = await prodRes.json();
                setProducts(data.data || data);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) void fetchProducts(productSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch, token]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) void fetchCustomers(customerSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch, token]);

    // Re-price all items when customer type toggles
    useEffect(() => {
        setItems(prev => prev.map(item => {
            const newUnitPrice = customerType === "DISTRIBUTOR"
                ? (item.pts || item.ptr || item.unitPrice)
                : (item.ptr || item.pts || item.unitPrice);
            return {
                ...item,
                unitPrice: newUnitPrice,
                gstAmount: (item.quantity * newUnitPrice * item.gstRate) / 100,
                total: item.quantity * newUnitPrice,
            };
        }));
    }, [customerType]);

    useEffect(() => {
        const draft = {
            selectedCustomerId,
            items,
            paymentMethod,
            customerType,
            extraDiscount,
        };
        localStorage.setItem(BILLING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, [selectedCustomerId, items, paymentMethod, customerType, extraDiscount]);

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const gst = items.reduce((acc, item) => acc + item.gstAmount, 0);
        const discount = extraDiscount;
        return { subtotal, gst, discount, net: Math.max(0, subtotal + gst - discount) };
    }, [items, extraDiscount]);

    const isSavingRef = useRef(false);

    const handleSave = async () => {
        if (!selectedCustomerId) return alert("Please select a customer");
        if (items.length === 0) return alert("Please add items to the invoice");

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/sales/invoices`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerId: selectedCustomerId,
                    customerType,
                    items: items.map(item => ({
                        productId: item.productId,
                        batchId: item.batchId,
                        quantity: item.quantity,
                        freeQuantity: item.freeQuantity || 0,
                        unitPrice: item.unitPrice,
                    })),
                    paymentMethod,
                    discountAmount: totals.discount,
                    invoiceDate: new Date().toISOString().split("T")[0],
                }),
            });

            if (response.ok) {
                const savedInvoice = await response.json();
                // Snapshot all data before clearing the form
                const invoiceNo = savedInvoice.invoiceNumber || "INV";
                flushSync(() => setCurrentInvoiceNumber(invoiceNo));
                setSavedInvoiceDialog({
                    invoiceNumber: invoiceNo,
                    customer: { ...printCustomer },
                    snapshotItems: [...items],
                    snapshotTotals: { ...totals },
                    snapshotPaymentMethod: paymentMethod,
                    snapshotCustomerType: customerType,
                });
                setItems([]);
                setSelectedCustomerId("");
                setPaymentMethod("CASH");
                setExtraDiscount(0);

                localStorage.removeItem(BILLING_DRAFT_STORAGE_KEY);
                void fetchNextInvoiceNumber();
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch {
            alert("Failed to save invoice");
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault();
                document.getElementById("add-item-trigger")?.click();
            }
            if (e.key === "F10") {
                e.preventDefault();
                handlePrint();
            }
            if (e.key === "F12") {
                e.preventDefault();
                if (!isSavingRef.current) void handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getBatchPrice = (batch: Batch) => {
        if (customerType === "PHARMACY") return batch.ptr || batch.salePrice;
        return batch.pts || batch.salePrice;
    };

    const addItem = (product: Product) => {
        const defaultBatch = product.batches[0];
        if (!defaultBatch) return;

        const unitPrice = getBatchPrice(defaultBatch);
        setItems([
            ...items,
            {
                id: Math.random().toString(36).slice(2, 11),
                productId: product.id,
                name: product.name,
                company: product.company || "",
                packing: product.packing || "",
                hsnCode: product.hsnCode || "",
                batchId: defaultBatch.id,
                batchNumber: defaultBatch.batchNumber,
                expiryDate: defaultBatch.expiryDate,
                quantity: 1,
                freeQuantity: 0,
                mrp: defaultBatch.mrp || defaultBatch.salePrice || 0,
                ptr: defaultBatch.ptr || 0,
                pts: defaultBatch.pts || 0,
                unitPrice,
                discountPct: 0,
                gstRate: product.gstRate,
                gstAmount: (unitPrice * product.gstRate) / 100,
                total: unitPrice,
            }
        ]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof BillingItem, value: any) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === "batchId") {
                const product = products.find(p => p.id === item.productId);
                const batch = product?.batches.find(b => b.id === value);
                if (batch) {
                    updated.batchNumber = batch.batchNumber;
                    updated.mrp = batch.mrp || batch.salePrice || 0;
                    updated.ptr = batch.ptr || 0;
                    updated.pts = batch.pts || 0;
                    updated.unitPrice = getBatchPrice(batch);
                }
            }
            updated.total = updated.quantity * updated.unitPrice;
            updated.gstAmount = (updated.total * updated.gstRate) / 100;
            return updated;
        }));
    };

    const handleBarcodeScan = async (barcode: string) => {
        try {
            const response = await fetch(`${API_BASE}/inventory/products/barcode/${barcode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const product = await response.json();
                if (product.batches?.length > 0) {
                    addItem(product);
                } else {
                    alert(`Product "${product.name}" found but has no stock available.`);
                }
            } else {
                alert(`No product found with barcode: ${barcode}`);
            }
        } catch {
            alert("Failed to lookup barcode. Please try manual entry.");
        }
    };

    const handlePrint = async () => {
        if (!selectedCustomerId) return alert("Please select a customer");
        if (items.length === 0) return alert("Please add items to the invoice");

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/sales/invoices`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    customerId: selectedCustomerId,
                    customerType,
                    items: items.map(item => ({
                        productId: item.productId,
                        batchId: item.batchId,
                        quantity: item.quantity,
                        freeQuantity: item.freeQuantity || 0,
                        unitPrice: item.unitPrice,
                    })),
                    paymentMethod,
                    discountAmount: totals.discount,
                    invoiceDate: new Date().toISOString().split("T")[0],
                }),
            });

            if (response.ok) {
                const savedInvoice = await response.json();
                const invoiceNo = savedInvoice.invoiceNumber || "INV";
                const customerName = customers.find(c => c.id === selectedCustomerId)?.name || "";

                // Force DOM to re-render with real invoice number before grabbing HTML
                flushSync(() => setCurrentInvoiceNumber(invoiceNo));

                if (printRef.current) {
                    printOnPage(printRef.current, invoiceNo, customerName);
                }

                setItems([]);
                setSelectedCustomerId("");
                setPaymentMethod("CASH");
                setExtraDiscount(0);

                setCurrentInvoiceNumber("");
                localStorage.removeItem(BILLING_DRAFT_STORAGE_KEY);
                void fetchNextInvoiceNumber();
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch {
            alert("Failed to save invoice");
        } finally {
            setIsSaving(false);
        }
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const printCustomer = selectedCustomer
        ? {
            name: selectedCustomer.name,
            address: selectedCustomer.address || "",
            gstin: selectedCustomer.gstin || "",
            phone: selectedCustomer.phone || "",
            email: selectedCustomer.email || "",
            state: selectedCustomer.state || "",
            dlNo: selectedCustomer.dlNo || "",
            fssaiNo: selectedCustomer.fssaiNo || "",
        }
        : { name: "", address: "" };

    return (
        <RoleGate
            allowedRoles={["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">Invoice generation and billing features are restricted to authorized personnel.</p>
                    <Button variant="outline" onClick={() => window.location.href = "/app"}>Back to Dashboard</Button>
                </div>
            }
        >
            {!canAccess ? (
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-amber-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Restricted Access</h1>
                    <p className="text-slate-500 max-w-sm">You do not have permission to generate invoices. Please contact an administrator if you need this access.</p>
                    <Button variant="outline" onClick={() => window.location.href = "/app"}>Back to Dashboard</Button>
                </div>
            ) : (
                <div className="space-y-4 no-print">
                    {/* Header — stacks on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Generate Invoice</h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                {nextInvoiceNumber && (
                                    <span className="text-sm font-mono font-semibold text-slate-700">{nextInvoiceNumber}</span>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
                                <Printer className="h-4 w-4 sm:mr-2" />
                                <span className="sm:inline">Print Proforma</span>
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                                {isSaving ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Save className="h-4 w-4 sm:mr-2" />}
                                <span className="sm:inline">Save Invoice (F12)</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pb-24 md:pb-0">
                        <div className="lg:col-span-3 space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Customer Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Input placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            {loading ? (
                                                <Skeleton className="h-10 w-full rounded-md" />
                                            ) : (
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                                                    <option value="">Select Customer</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.gstin}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <CustomerDialog
                                            type="customer"
                                            trigger={<Button variant="outline">New Customer</Button>}
                                            onSuccess={(newCustomer) => {
                                                setCustomers([...customers, newCustomer]);
                                                setSelectedCustomerId(newCustomer.id);
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Invoice Items</CardTitle>
                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button size="sm" id="add-item-trigger">
                                                        <Plus className="h-4 w-4 sm:mr-2" />
                                                        <span className="hidden sm:inline">Add Item (F2)</span>
                                                        <span className="sm:hidden">Add</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-0 w-72" side="bottom" align="end">
                                                    <Command>
                                                        <CommandInput placeholder="Search product..." value={productSearch} onValueChange={setProductSearch} />
                                                        <CommandList>
                                                            {loadingProducts ? (
                                                                <div className="p-2 space-y-2">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <div key={i} className="flex justify-between items-center px-2 py-1">
                                                                            <Skeleton className="h-4 w-36" />
                                                                            <Skeleton className="h-4 w-12" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : products.length === 0 ? (
                                                                <CommandEmpty>Type to search products...</CommandEmpty>
                                                            ) : (
                                                                <CommandGroup>
                                                                    {products.map((p) => (
                                                                        <CommandItem key={p.id} onSelect={() => addItem(p)} className="flex justify-between">
                                                                            <span>{p.name}</span>
                                                                            <span className="text-xs text-muted-foreground">GST: {p.gstRate}%</span>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            )}
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <Button size="sm" variant="outline" onClick={() => setScannerOpen(true)}>
                                                <Camera className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Scan Barcode</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {/* Desktop table */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead className="w-[40px]">Sr.</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead className="text-right w-20">Qty</TableHead>
                                                    <TableHead className="text-right w-16">Free</TableHead>
                                                    <TableHead className="text-right">MRP</TableHead>
                                                    <TableHead className="text-right text-emerald-700">{customerType === "DISTRIBUTOR" ? "PTS" : "PTR"}</TableHead>
                                                    <TableHead className="text-right">GST</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ShoppingCart className="h-8 w-8 opacity-20" />
                                                                <p>No items added yet.</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : items.map((item, index) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="text-slate-500">{index + 1}</TableCell>
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell>
                                                            <select className="text-xs bg-slate-100 rounded px-2 py-1" value={item.batchId} onChange={(e) => updateItem(item.id, "batchId", e.target.value)}>
                                                                {products.find(p => p.id === item.productId)?.batches.map(b => <option key={b.id} value={b.id}>{b.batchNumber}{b.supplier ? ` · ${b.supplier.name}` : ""} ({b.currentStock})</option>)}
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="text-right"><Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-8 w-16 ml-auto text-right" value={item.quantity === 0 ? "" : item.quantity} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)); updateItem(item.id, "quantity", isNaN(v) ? 0 : v); }} /></TableCell>
                                                        <TableCell className="text-right"><Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-8 w-14 ml-auto text-right text-green-700 bg-green-50" placeholder="0" value={(item.freeQuantity || 0) === 0 ? "" : item.freeQuantity} onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)); updateItem(item.id, "freeQuantity", isNaN(v) ? 0 : v); }} /></TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-slate-500">₹{(item.mrp || 0).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-emerald-600">₹{item.unitPrice.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm text-slate-400">{item.gstRate}%</TableCell>
                                                        <TableCell className="text-right font-bold font-mono">₹{(item.total + item.gstAmount).toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Mobile item cards */}
                                    <div className="md:hidden">
                                        {items.length === 0 ? (
                                            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                                                <ShoppingCart className="h-8 w-8 opacity-30" />
                                                <p className="text-sm">No items yet. Tap Add to start.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {items.map((item, index) => (
                                                    <div key={item.id} className="p-3 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-slate-900 truncate">{index + 1}. {item.name}</p>
                                                                <div className="mt-1">
                                                                    <select className="text-xs bg-slate-100 rounded px-2 py-1 w-full" value={item.batchId} onChange={(e) => updateItem(item.id, "batchId", e.target.value)}>
                                                                        {products.find(p => p.id === item.productId)?.batches.map(b => (
                                                                            <option key={b.id} value={b.id}>{b.batchNumber}{b.supplier ? ` · ${b.supplier.name}` : ""} (Stock: {b.currentStock})</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeItem(item.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div>
                                                                <p className="text-slate-500 mb-1">Qty</p>
                                                                <Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-8 text-right text-sm font-semibold" value={item.quantity === 0 ? "" : item.quantity} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)); updateItem(item.id, "quantity", isNaN(v) ? 0 : v); }} />
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500 mb-1">Free</p>
                                                                <Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-8 text-right text-sm text-green-700 bg-green-50" placeholder="0" value={(item.freeQuantity || 0) === 0 ? "" : item.freeQuantity} onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)); updateItem(item.id, "freeQuantity", isNaN(v) ? 0 : v); }} />
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500 mb-1">Total</p>
                                                                <p className="h-8 flex items-center justify-end font-bold font-mono text-sm text-slate-900">₹{(item.total + item.gstAmount).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            <span className="text-emerald-600 font-medium">{customerType === "DISTRIBUTOR" ? "PTS" : "PTR"}: ₹{item.unitPrice.toFixed(2)}</span>
                                                            <span className="ml-2">MRP: ₹{(item.mrp || 0).toFixed(2)}</span>
                                                            <span className="ml-2">GST: {item.gstRate}%</span>
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bill Summary — visible on mobile, hidden on desktop (shown in sidebar) */}
                            <Card className="md:hidden border shadow-sm rounded-xl overflow-hidden">
                                <CardHeader className="border-b py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                                        <CardTitle className="text-sm font-bold text-slate-800">Bill Summary</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-semibold font-mono">₹{totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">GST</span>
                                            <span className="font-semibold text-emerald-600 font-mono">+₹{totals.gst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Extra Discount</span>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                                                <Input type="text" inputMode="decimal" pattern="[0-9.]*" className="h-7 w-20 text-right pl-5 pr-2 text-sm" value={extraDiscount === 0 ? "" : extraDiscount} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value)); setExtraDiscount(isNaN(v) ? 0 : v); }} />
                                            </div>
                                        </div>
                                        {totals.discount > 0 && (
                                            <div className="flex justify-between text-rose-500">
                                                <span>Total Savings</span>
                                                <span className="font-bold font-mono">-₹{totals.discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Type</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {(["PHARMACY", "DISTRIBUTOR"] as const).map(type => (
                                                <Button key={type} variant={customerType === type ? "default" : "outline"} size="sm" className={cn("h-8 text-[10px] font-bold", customerType === type ? "bg-emerald-600 text-white" : "text-slate-600")} onClick={() => setCustomerType(type)}>
                                                    {type === "PHARMACY" ? "Pharmacy (PTR)" : "Distributor (PTS)"}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</p>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {["CASH", "UPI", "CARD", "CREDIT"].map(mode => (
                                                <Button key={mode} variant={paymentMethod === mode ? "default" : "outline"} size="sm" className={cn("h-8 text-[11px] font-bold", paymentMethod === mode ? "bg-blue-600 text-white" : "text-slate-600")} onClick={() => setPaymentMethod(mode)}>
                                                    {mode}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Net Amount</p>
                                        <p className="text-2xl font-black text-slate-900 font-mono">₹{totals.net.toFixed(2)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {/* Desktop Bill Summary */}
                            <Card className="bg-white border shadow-sm rounded-xl overflow-hidden hidden md:block">
                                <CardHeader className="border-b py-3 px-5">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                                        <CardTitle className="text-sm font-bold text-slate-800">Bill Summary</CardTitle>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Subtotal</span>
                                            <span className="font-semibold text-slate-900 font-mono">₹{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">GST (Taxes)</span>
                                            <span className="font-semibold text-emerald-600 font-mono">+₹{totals.gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100/60 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-slate-700">Extra Discount</span>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9.]*"
                                                        className="h-8 w-24 bg-slate-50 border-slate-200 text-right pr-2 pl-6 text-sm font-bold focus:bg-white transition-all rounded-md"
                                                        value={extraDiscount === 0 ? "" : extraDiscount}
                                                        placeholder="0"
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => { const v = e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value)); setExtraDiscount(isNaN(v) ? 0 : v); }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 italic">Total Savings</span>
                                                <span className="font-bold text-rose-500 font-mono">-₹{totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["PHARMACY", "DISTRIBUTOR"] as const).map(type => (
                                                <Button
                                                    key={type}
                                                    variant={customerType === type ? "default" : "outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 text-[11px] font-bold rounded-lg transition-all",
                                                        customerType === type
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                            : "text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    )}
                                                    onClick={() => setCustomerType(type)}
                                                >
                                                    {type === "PHARMACY" ? "Pharmacy (PTR)" : "Distributor (PTS)"}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {["CASH", "UPI", "CARD", "CREDIT"].map(mode => (
                                                <Button
                                                    key={mode}
                                                    variant={paymentMethod === mode ? "default" : "outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 text-[11px] font-bold rounded-lg transition-all",
                                                        paymentMethod === mode
                                                            ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                                                            : "text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    )}
                                                    onClick={() => setPaymentMethod(mode)}
                                                >
                                                    {mode}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Net Amount</span>
                                            <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                                                ₹{totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", pointerEvents: "none", zIndex: -1 }}>
            <InvoicePrint
                ref={printRef}
                preview={true}
                invoiceNumber={currentInvoiceNumber || "DRAFT"}
                date={new Date()}
                businessProfile={businessProfile}
                customer={printCustomer}
                paymentMethod={paymentMethod}
                customerType={customerType}
                items={items.map(item => ({
                    id: item.id,
                    name: item.name,
                    company: item.company,
                    packing: item.packing,
                    hsnCode: item.hsnCode,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: item.quantity,
                    freeQuantity: item.freeQuantity || 0,
                    mrp: item.mrp || 0,
                    ptr: customerType === "DISTRIBUTOR" ? (item.pts || item.unitPrice) : (item.ptr || item.unitPrice),
                    unitPrice: item.unitPrice,
                    discountPct: item.discountPct || 0,
                    gstRate: item.gstRate,
                    gstAmount: item.gstAmount,
                    total: item.total
                }))}
                totals={totals}
            />
            </div>
            <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />

            {/* Invoice Saved Dialog */}
            <Dialog open={!!savedInvoiceDialog} onOpenChange={(open) => { if (!open) { setSavedInvoiceDialog(null); setCurrentInvoiceNumber(""); } }}>
                <DialogContent className="max-w-4xl sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-4 pt-4 pb-3 flex-shrink-0 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <DialogTitle className="text-base font-semibold">
                                    Invoice Saved — {savedInvoiceDialog?.invoiceNumber}
                                </DialogTitle>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 mr-8"
                                onClick={() => {
                                    if (viewRef.current && savedInvoiceDialog) {
                                        printOnPage(viewRef.current, savedInvoiceDialog.invoiceNumber, savedInvoiceDialog.customer.name);
                                    }
                                }}
                            >
                                <Printer className="h-4 w-4" />
                                Print / Save PDF
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="overflow-auto flex-1 p-4 bg-slate-50">
                        {savedInvoiceDialog && (
                            <div className="bg-white shadow rounded-lg">
                                <InvoicePrint
                                    ref={viewRef}
                                    preview={true}
                                    invoiceNumber={savedInvoiceDialog.invoiceNumber}
                                    date={new Date()}
                                    businessProfile={businessProfile}
                                    customer={savedInvoiceDialog.customer}
                                    paymentMethod={savedInvoiceDialog.snapshotPaymentMethod}
                                    customerType={savedInvoiceDialog.snapshotCustomerType}
                                    items={savedInvoiceDialog.snapshotItems.map(item => ({
                                        id: item.id,
                                        name: item.name,
                                        company: item.company,
                                        packing: item.packing,
                                        hsnCode: item.hsnCode,
                                        batchNumber: item.batchNumber,
                                        expiryDate: item.expiryDate,
                                        quantity: item.quantity,
                                        freeQuantity: item.freeQuantity || 0,
                                        mrp: item.mrp || 0,
                                        ptr: savedInvoiceDialog.snapshotCustomerType === "DISTRIBUTOR" ? (item.pts || item.unitPrice) : (item.ptr || item.unitPrice),
                                        unitPrice: item.unitPrice,
                                        discountPct: item.discountPct || 0,
                                        gstRate: item.gstRate,
                                        gstAmount: item.gstAmount,
                                        total: item.total
                                    }))}
                                    totals={savedInvoiceDialog.snapshotTotals}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </RoleGate>
    );
}
