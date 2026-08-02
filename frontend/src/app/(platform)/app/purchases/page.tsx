"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Save,
    FileDown,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    UserPlus,
    FileText,
    FileUp,
    FileSearch,
    Upload,
    History,
    Edit2,
    X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RoleGate } from "@/components/auth/role-gate";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import { AddSupplierDialog } from "@/components/purchases/supplier-dialog";

interface PurchaseItem {
    id: string;
    productId: string;
    name: string;
    composition: string;
    hsnCode: string;
    packing: string;
    batchNumber: string;
    expiryDate: string; // YYYY-MM-DD
    quantity: number;
    freeQty: number;
    discountPct: number;
    purchasePrice: number;
    salePrice: number;
    ptr: number;
    pts: number;
    nr: number;
}

interface Product {
    id: string;
    name: string;
    composition?: string;
    hsnCode?: string;
    packing?: string;
    gstRate: number;
    mrp?: number;
    batches?: { currentStock: number; ptr: number; pts: number; nr: number }[];
}

interface Supplier {
    id: string;
    name: string;
}

interface ExtractedInvoiceItem {
    name?: string;
    composition?: string;
    hsn?: string;
    pack?: string;
    batch?: string;
    expiry?: string;
    quantity?: number;
    free?: number;
    pts?: number;
    ptr?: number;
    mrp?: number;
    discount?: number;
    gstPercent?: number;
    nr?: number;
    amount?: number;
}

interface ExtractedInvoiceResponse {
    supplierName?: string;
    invoiceNumber?: string;
    items?: ExtractedInvoiceItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
console.log("[PurchasesPage] Using API_BASE:", API_BASE);
const PURCHASE_DRAFT_STORAGE_KEY = "purchase_draft_v2";
const SUPPORTED_INVOICE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_INVOICE_UPLOAD_SIZE = 10 * 1024 * 1024;

interface PurchaseRecord {
    id: string;
    billNumber: string;
    createdAt: string;
    netAmount: number;
    totalAmount: number;
    gstAmount: number;
    roundOff: number;
    invoiceDate?: string;
    dueDate?: string;
    supplier: { id: string; name: string };
    items: {
        id: string;
        quantity: number;
        freeQty: number;
        discountPct: number;
        purchasePrice: number;
        product: { id: string; name: string; composition?: string; packing?: string } | null;
        batch: { id: string; batchNumber: string; expiryDate: string; salePrice: number; ptr: number; pts: number; nr: number } | null;
    }[];
}

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    // Auto-size text input to its content length
    const sz = (val: string, min = 4) => Math.max((val?.length || 0) + 1, min);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSupplierDialog, setShowSupplierDialog] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [gstPercent, setGstPercent] = useState(() => {
        try {
            const saved = localStorage.getItem("pharmaflow_default_gst_rate");
            return saved !== null ? (parseFloat(saved) || 5) : 5;
        } catch { return 5; }
    });
    const [roundOff, setRoundOff] = useState<number>(0);
    const today = new Date().toISOString().slice(0, 10);
    const [invoiceDate, setInvoiceDate] = useState(today);
    const [dueDate, setDueDate] = useState(today);

    const derivePurchasePrice = (item: PurchaseItem) => {
        const nr = typeof item.nr === "number" && !Number.isNaN(item.nr) ? item.nr : 0;
        const discountPct = typeof item.discountPct === "number" && !Number.isNaN(item.discountPct) ? item.discountPct : 0;
        if (nr > 0) {
            return parseFloat((nr * (1 - discountPct / 100)).toFixed(2));
        }
        return item.purchasePrice > 0 ? item.purchasePrice : 0;
    };

    // History state
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("entry");

    // UI Feedback State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const savedDraft = localStorage.getItem(PURCHASE_DRAFT_STORAGE_KEY);
        if (!savedDraft) return;

        try {
            const draft = JSON.parse(savedDraft);
            setSelectedSupplierId(draft.selectedSupplierId || "");
            setBillNumber(draft.billNumber || "");
            setItems(Array.isArray(draft.items) ? draft.items.map((i: any) => ({ freeQty: 0, discountPct: 0, ...i })) : []);
        } catch (error) {
            console.error("Failed to restore purchase draft:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        // window-level drag and drop to catch drops anywhere on the page
        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDragging(true);
            }
        };

        const handleWindowDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                handleInvoiceUpload(e as any);
            }
        };

        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drop', handleWindowDrop);

        // Clear alerts after 5 seconds
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('dragover', handleWindowDragOver);
                window.removeEventListener('drop', handleWindowDrop);
            };
        }

        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, [error, success]);

    useEffect(() => {
        const draft = {
            selectedSupplierId,
            billNumber,
            items,
        };
        localStorage.setItem(PURCHASE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, [selectedSupplierId, billNumber, items]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            const [supRes, prodRes] = await Promise.all([
                fetch(`${API_BASE}/parties/suppliers`, { headers }),
                fetch(`${API_BASE}/inventory/products`, { headers })
            ]);

            if (supRes.ok) {
                const result = await supRes.json();
                setSuppliers(result.data || result);
            }
            if (prodRes.ok) {
                const result = await prodRes.json();
                setProducts(result.data || result);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            setError("Failed to load suppliers or products. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE}/purchases`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPurchaseHistory(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to fetch purchase history:", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDeletePurchase = async (id: string, billNo: string) => {
        if (!confirm(`Delete purchase bill "${billNo}"? This will reverse the stock and supplier balance. This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE}/purchases/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSuccess(`Purchase "${billNo}" deleted. Stock and balance reversed.`);
                fetchHistory();
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.message || 'Failed to delete purchase.');
            }
        } catch {
            setError('Network error. Failed to delete purchase.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditPurchase = (p: PurchaseRecord) => {
        setEditingPurchaseId(p.id);
        setSelectedSupplierId(p.supplier.id);
        setBillNumber(p.billNumber);
        setRoundOff(p.roundOff || 0);
        if (p.invoiceDate) setInvoiceDate(p.invoiceDate.slice(0, 10));
        if (p.dueDate) setDueDate(p.dueDate.slice(0, 10));
        setItems(p.items.map(item => {
            const pts = item.batch?.pts || 0;
            const discountPct = item.discountPct || 0;
            // Always derive NR and purchasePrice from PTS so old records with wrong rate are corrected
            const nr = parseFloat((pts * (1 - discountPct / 100)).toFixed(2));
            return {
                id: Math.random().toString(36).substr(2, 9),
                productId: item.product?.id || "",
                name: item.product?.name || "",
                composition: item.product?.composition || "",
                hsnCode: (item.product as any)?.hsnCode || "",
                packing: item.product?.packing || "",
                batchNumber: item.batch?.batchNumber || "",
                expiryDate: item.batch?.expiryDate ? item.batch.expiryDate.slice(0, 10) : "",
                quantity: item.quantity,
                freeQty: item.freeQty || 0,
                discountPct,
                purchasePrice: nr || item.purchasePrice,
                salePrice: item.batch?.salePrice || 0,
                ptr: item.batch?.ptr || 0,
                pts,
                nr: nr || item.batch?.nr || 0,
            };
        }));
        setActiveTab("entry");
        setError(null);
        setSuccess(null);
    };

    const handleCancelEdit = () => {
        setEditingPurchaseId(null);
        setSelectedSupplierId("");
        setBillNumber("");
        setItems([]);
        localStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
    };

    const addItem = () => {
        const newItem: PurchaseItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: "",
            name: "",
            composition: "",
            hsnCode: "",
            packing: "",
            batchNumber: "",
            expiryDate: "",
            quantity: 1,
            freeQty: 0,
            discountPct: 0,
            purchasePrice: 0,
            salePrice: 0,
            ptr: 0,
            pts: 0,
            nr: 0,
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof PurchaseItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'productId') {
                const product = products.find(p => p.id === value);
                if (product) {
                    updated.name = product.name;
                    updated.composition = product.composition || "";
                    updated.hsnCode = product.hsnCode || "";
                    updated.packing = product.packing || "";
                    if (product.mrp) updated.salePrice = product.mrp;
                    // Auto-fill PTR and PTS from the batch with the highest stock
                    const bestBatch = product.batches?.length
                        ? product.batches.reduce((a, b) => b.currentStock > a.currentStock ? b : a)
                        : null;
                    if (bestBatch?.ptr) updated.ptr = bestBatch.ptr;
                    if (bestBatch?.pts) updated.pts = bestBatch.pts;
                    if (bestBatch?.nr) updated.nr = bestBatch.nr;
                    updated.purchasePrice = derivePurchasePrice(updated);
                }
            }
            // Purchase price = NR × (1 - Disc%)
            // NR = what you pay the supplier per unit (before discount)
            if (field === 'nr' || field === 'discountPct') {
                const nr = field === 'nr' ? value : updated.nr;
                const disc = field === 'discountPct' ? value : updated.discountPct;
                updated.purchasePrice = parseFloat((nr * (1 - disc / 100)).toFixed(2));
            }
            if (field !== 'nr' && field !== 'discountPct' && field !== 'productId') {
                updated.purchasePrice = derivePurchasePrice(updated);
            }
            return updated;
        }));
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * (item.purchasePrice || 0)), 0);
        const tax = subtotal * (gstPercent / 100);
        return { subtotal, tax, net: subtotal + tax + roundOff };
    }, [items, gstPercent, roundOff]);

    const validateForm = () => {
        if (!selectedSupplierId) return "Please select a supplier.";
        if (!billNumber.trim()) return "Please enter a bill number.";
        if (items.length === 0) return "Please add at least one item.";

        for (const item of items) {
            if (!item.productId && !item.name.trim()) return "All items must have a product selected or a name entered.";
            if (!item.batchNumber.trim()) return "All items must have a batch number.";
            if (!item.expiryDate) return "All items must have an expiry date.";
            if (item.quantity <= 0) return "Quantity must be greater than 0.";
            if (item.purchasePrice <= 0) return "Purchase price must be greater than 0.";
        }
        return null;
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(null);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);
        try {
            const url = editingPurchaseId
                ? `${API_BASE}/purchases/${editingPurchaseId}`
                : `${API_BASE}/purchases`;
            const response = await fetch(url, {
                method: editingPurchaseId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    supplierId: selectedSupplierId,
                    billNumber,
                    invoiceDate: invoiceDate || undefined,
                    dueDate: dueDate || undefined,
                    roundOff,
                    items: items.map(item => ({
                        productId: item.productId || undefined,
                        name: item.name,
                        composition: item.composition,
                        hsnCode: item.hsnCode,
                        packing: item.packing,
                        batchNumber: item.batchNumber,
                        expiryDate: new Date(item.expiryDate).toISOString(),
                        quantity: item.quantity,
                        freeQty: item.freeQty,
                        discountPct: item.discountPct,
                        purchasePrice: item.purchasePrice,
                        salePrice: item.salePrice,
                        ptr: item.ptr,
                        pts: item.pts,
                        nr: item.nr
                    }))
                }),
            });

            if (response.ok) {
                setSuccess(editingPurchaseId ? "Purchase updated successfully! Stock has been adjusted." : "Purchase recorded successfully! Stock has been updated.");
                setItems([]);
                setBillNumber("");
                setSelectedSupplierId("");
                setEditingPurchaseId(null);
                setRoundOff(0);
                setInvoiceDate(new Date().toISOString().slice(0, 10));
                setDueDate(new Date().toISOString().slice(0, 10));
                localStorage.removeItem(PURCHASE_DRAFT_STORAGE_KEY);
                fetchData();
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Failed to save purchase.");
            }
        } catch (error) {
            setError("Network error. Failed to connect to server.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined;
        let eventTarget: HTMLInputElement | null = null;
        
        if (e.type === 'change') {
            const changeEvent = e as React.ChangeEvent<HTMLInputElement>;
            eventTarget = changeEvent.target;
            file = eventTarget.files?.[0];
        } else if (e.type === 'drop') {
            const dragEvent = e as React.DragEvent;
            file = dragEvent.dataTransfer.files?.[0];
        }

        if (!file) return;
        const normalizedMimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;

        if (!SUPPORTED_INVOICE_TYPES.has(normalizedMimeType)) {
            setError("Please upload a PDF, JPG, PNG, or WEBP invoice.");
            if (eventTarget) eventTarget.value = "";
            return;
        }

        if (file.size > MAX_INVOICE_UPLOAD_SIZE) {
            setError("Invoice file is too large. Please upload a file smaller than 10MB.");
            if (eventTarget) eventTarget.value = "";
            return;
        }

        setIsUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE}/inventory/extract-invoice`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error (${response.status})`);
            }

            const data: ExtractedInvoiceResponse = await response.json();
            const extractedItems = Array.isArray(data.items) ? data.items : [];
            
            // 1. Match Supplier
            const extractedSupplierName = data.supplierName?.trim();
            if (extractedSupplierName) {
                const supplier = suppliers.find(s => 
                    s.name.toLowerCase().includes(extractedSupplierName.toLowerCase()) ||
                    extractedSupplierName.toLowerCase().includes(s.name.toLowerCase())
                );
                if (supplier) {
                    setSelectedSupplierId(supplier.id);
                } else {
                    setError(`Supplier "${extractedSupplierName}" not found. Please add them first.`);
                }
            }

            if (data.invoiceNumber) setBillNumber(data.invoiceNumber);

            // 2. Map Items
            const newItems: PurchaseItem[] = extractedItems
                .filter((item) => item?.name)
                .map((item) => {
                const product = products.find(p => 
                    p.name.toLowerCase().includes(item.name!.toLowerCase()) ||
                    item.name!.toLowerCase().includes(p.name.toLowerCase())
                );

                // Purchase price = PTS (what stockist pays). Fallback to PTR if PTS not present.
                const purchasePrice = item.pts || item.ptr || (item.nr ? parseFloat((item.nr * (1 - (item.discount || 0) / 100)).toFixed(2)) : 0);
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: product?.id || "",
                    name: item.name || "",
                    composition: item.composition || "",
                    hsnCode: item.hsn || "",
                    packing: item.pack || "",
                    batchNumber: item.batch || "",
                    expiryDate: item.expiry || "",
                    quantity: item.quantity || 1,
                    freeQty: item.free || 0,
                    discountPct: item.discount || 0,
                    purchasePrice,
                    salePrice: item.mrp || 0,
                    ptr: item.ptr || 0,
                    pts: item.pts || 0,
                    nr: item.nr || 0,
                };
            });

            if (newItems.length > 0) {
                setItems(newItems);
                setSuccess(`Successfully extracted ${newItems.length} items from invoice.`);
            } else {
                setError("The invoice was uploaded, but no items could be extracted. Please try a clearer file.");
            }

        } catch (error: any) {
            console.error("Invoice upload error details:", error);
            // Handle specific error types if needed
            let displayMsg = error.message || "Failed to process invoice.";
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                displayMsg = `Network Error: Could not connect to the server at ${API_BASE}. Please check your internet or if the backend is running.`;
            }
            setError(`Invoice extraction error: ${displayMsg}`);
        } finally {
            setIsUploading(false);
            if (eventTarget) eventTarget.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleInvoiceUpload(e);
    };

    return (
        <RoleGate
            allowedRoles={["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">
                        Purchase entry and stock arrival recording are restricted to authorized warehouse and account personnel.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/app"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6 pb-24 md:pb-6">
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
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'history') fetchHistory(); }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="entry" className="flex-1 sm:flex-none">
                            {editingPurchaseId ? <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit Entry</> : "New Entry (GRN)"}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex-1 sm:flex-none" onClick={() => { if (editingPurchaseId) handleCancelEdit(); }}>
                            <History className="h-3.5 w-3.5 mr-1.5" />Purchase History
                        </TabsTrigger>
                    </TabsList>
                    {editingPurchaseId && (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            Editing purchase — changes will replace the original
                        </span>
                    )}
                </div>

                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="text-sm font-bold">Purchase History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Bill No</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Supplier</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Items</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase">Net Amount</TableHead>
                                        <TableHead className="w-[90px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : purchaseHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No purchase records found.</TableCell>
                                        </TableRow>
                                    ) : purchaseHistory.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</TableCell>
                                            <TableCell className="font-mono text-xs font-bold">{p.billNumber}</TableCell>
                                            <TableCell className="text-sm font-medium">{p.supplier?.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">{p.items?.length || 0} items</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">₹{p.netAmount?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => handleEditPurchase(p)}
                                                        title="Edit purchase"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-red-50"
                                                        disabled={deletingId === p.id}
                                                        onClick={() => handleDeletePurchase(p.id, p.billNumber)}
                                                        title="Delete purchase"
                                                    >
                                                        {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="entry">
            <div
                className="space-y-6 relative min-h-[85vh]"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary m-4 rounded-xl"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <FileUp className="h-10 w-10 text-primary animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Drop Invoice Here</h3>
                                <p className="text-slate-500">PDF or Images (JPG, PNG) supported</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                    <p className="text-sm text-muted-foreground hidden sm:block">
                        {editingPurchaseId ? "Editing existing purchase — save to replace" : "Record a new goods receipt (GRN)"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="file"
                            id="invoice-upload"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleInvoiceUpload}
                            disabled={isUploading}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 flex-1 sm:flex-none"
                            onClick={() => document.getElementById('invoice-upload')?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                            Upload Invoice
                        </Button>
                        {editingPurchaseId && (
                            <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1 sm:flex-none border-slate-300">
                                <X className="mr-1.5 h-4 w-4" /> Cancel Edit
                            </Button>
                        )}
                        <Button size="sm" onClick={handleSave} disabled={isUploading || isSaving} className={`w-full sm:w-auto ${editingPurchaseId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
                            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                            {editingPurchaseId ? "Update Purchase" : "Save Purchase"}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <Card className="flex-1">
                        <div className="py-2 px-4 border-b bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bill Details</p>
                        </div>
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Supplier</label>
                                    <div className="flex gap-1.5">
                                        <select
                                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
                                            value={selectedSupplierId}
                                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <Button
                                            variant="outline"
                                            className="h-9 w-9 p-0 shrink-0 border-primary/20 text-primary hover:bg-primary/5"
                                            onClick={() => setShowSupplierDialog(true)}
                                            title="Add New Supplier"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3">
                                <div className="space-y-1.5 col-span-2 md:w-40">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Invoice Number</label>
                                    <Input
                                        className="h-9 border-slate-200 font-mono text-sm"
                                        placeholder="Enter Bill No."
                                        value={billNumber}
                                        onChange={(e) => setBillNumber(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5 md:w-36">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Invoice Date</label>
                                    <Input
                                        type="date"
                                        className="h-9 border-slate-200 text-sm"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5 md:w-36">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Due Date</label>
                                    <Input
                                        type="date"
                                        className="h-9 border-slate-200 text-sm"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>

                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:w-72 bg-slate-50 border-dashed">
                        <div className="py-2 px-4 border-b">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Summary</p>
                        </div>
                        <CardContent className="p-3 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Gross:</span>
                                <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-slate-500">GST</span>
                                    <input
                                        type="number"
                                        className="w-8 bg-transparent border-none p-0 text-[10px] font-bold text-slate-600 focus:ring-0 text-center"
                                        value={gstPercent === 0 ? "" : gstPercent}
                                        placeholder="0"
                                        onChange={(e) => { const v = e.target.value === "" ? 0 : parseFloat(e.target.value); setGstPercent(isNaN(v) ? 0 : v); }}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">%</span>
                                </div>
                                <span className="font-mono font-semibold">₹{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pl-2">
                                <span className="text-slate-400">SGST ({(gstPercent / 2).toFixed(1)}%)</span>
                                <span className="font-mono text-slate-500">₹{(totals.tax / 2).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pl-2">
                                <span className="text-slate-400">CGST ({(gstPercent / 2).toFixed(1)}%)</span>
                                <span className="font-mono text-slate-500">₹{(totals.tax / 2).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Round Off</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-20 bg-transparent border-none p-0 text-[11px] font-mono text-right text-slate-600 focus:ring-0"
                                    value={roundOff === 0 ? "" : roundOff}
                                    placeholder="0.00"
                                    onChange={(e) => { const v = parseFloat(e.target.value); setRoundOff(isNaN(v) ? 0 : v); }}
                                />
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200 pt-1 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Bill:</span>
                                <span className="text-lg font-black text-primary font-mono tracking-tighter">₹{totals.net.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <div className="flex flex-wrap items-center justify-between py-2 px-4 border-b gap-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Item Entry Details</p>
                        <div className="flex gap-2 items-center">
                            <AddProductDialog onProductAdded={fetchData} />
                            <Button size="sm" onClick={addItem} className="h-8 px-3 text-xs">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
                            </Button>
                        </div>
                    </div>
                    <CardContent className="p-0 border-t overflow-x-auto">
                        <Table style={{ minWidth: "1400px" }}>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="w-10 text-center text-[10px] font-bold uppercase">S NO</TableHead>
                                    <TableHead className="min-w-[150px] text-[10px] font-bold uppercase">BRAND NAME</TableHead>
                                    <TableHead className="min-w-[120px] text-[10px] font-bold uppercase">COMPO</TableHead>
                                    <TableHead className="min-w-[60px] text-[10px] font-bold uppercase">HSN</TableHead>
                                    <TableHead className="min-w-[70px] text-[10px] font-bold uppercase">PACKING</TableHead>
                                    <TableHead className="min-w-[80px] text-[10px] font-bold uppercase">BATCH NO</TableHead>
                                    <TableHead className="w-[130px] text-[10px] font-bold uppercase">EXPIRY</TableHead>
                                    <TableHead className="w-[75px] text-right text-[10px] font-bold uppercase">QTY</TableHead>
                                    <TableHead className="w-[65px] text-right text-[10px] font-bold uppercase">FREE</TableHead>
                                    <TableHead className="w-[65px] text-right text-[10px] font-bold uppercase">DISC%</TableHead>
                                    <TableHead className="w-[95px] text-right text-[10px] font-bold uppercase">MRP</TableHead>
                                    <TableHead className="w-[95px] text-right text-[10px] font-bold uppercase">PTR</TableHead>
                                    <TableHead className="w-[95px] text-right text-[10px] font-bold uppercase">PTS</TableHead>
                                    <TableHead className="w-[95px] text-right text-[10px] font-bold uppercase">NR</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={15} className="text-center py-12 text-muted-foreground italic text-sm">
                                            Click 'Add Item' to start recording purchase entry.
                                        </TableCell>
                                    </TableRow>
                                ) : items.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                        <TableCell className="text-center font-bold text-slate-400 text-xs">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 items-center">
                                                <select
                                                    className={`h-8 flex-1 text-[11px] bg-white border ${item.productId ? 'border-slate-200' : 'border-orange-200 bg-orange-50/30'} rounded px-1.5 focus:ring-1 focus:ring-primary outline-none transition-colors`}
                                                    value={item.productId}
                                                    onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                                                >
                                                    <option value="">{item.productId ? "Select Item" : "Product Not Found"}</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                {!item.productId && item.name && (
                                                    <AddProductDialog 
                                                        onProductAdded={(newProd) => {
                                                            fetchData();
                                                            if (newProd?.id) updateItem(item.id, 'productId', newProd.id);
                                                        }}
                                                        initialData={{
                                                            name: item.name,
                                                            composition: item.composition,
                                                            packing: item.packing,
                                                            mrp: item.salePrice
                                                        }}
                                                        triggerLabel=""
                                                        triggerClassName="h-8 w-8 p-0 shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] bg-slate-50"
                                                value={item.composition}
                                                placeholder="Composition"
                                                size={sz(item.composition, 10)}
                                                onChange={(e) => updateItem(item.id, 'composition', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] bg-slate-50 font-mono"
                                                value={item.hsnCode}
                                                placeholder="HSN"
                                                size={sz(item.hsnCode, 5)}
                                                onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] bg-slate-50"
                                                value={item.packing}
                                                placeholder="Packing"
                                                size={sz(item.packing, 5)}
                                                onChange={(e) => updateItem(item.id, 'packing', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] font-mono"
                                                value={item.batchNumber}
                                                placeholder="Batch"
                                                size={sz(item.batchNumber, 6)}
                                                onChange={(e) => updateItem(item.id, 'batchNumber', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px]"
                                                value={item.expiryDate}
                                                onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-bold"
                                                value={item.quantity === 0 ? "" : item.quantity}
                                                placeholder="0"
                                                min="0"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                    updateItem(item.id, 'quantity', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-bold text-emerald-600"
                                                value={item.freeQty === 0 ? "" : item.freeQty}
                                                placeholder="0"
                                                min="0"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                    updateItem(item.id, 'freeQty', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-bold text-amber-600"
                                                value={item.discountPct === 0 ? "" : item.discountPct}
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'discountPct', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-mono text-slate-700"
                                                value={item.salePrice === 0 ? "" : item.salePrice}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'salePrice', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-mono text-blue-600"
                                                value={item.ptr === 0 ? "" : item.ptr}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'ptr', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-mono text-green-600"
                                                value={item.pts === 0 ? "" : item.pts}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'pts', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-full text-right text-[11px] font-mono text-orange-600"
                                                value={item.nr === 0 ? "" : item.nr}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'nr', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-destructive hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    
                    {/* Removed redundant bottom total section as requested */}
                </Card>

                <AddSupplierDialog
                    open={showSupplierDialog}
                    onOpenChange={setShowSupplierDialog}
                    onSuccess={(newSup) => {
                        setSuppliers(prev => [...prev, newSup]);
                        setSelectedSupplierId(newSup.id);
                    }}
                />
            </div>
                </TabsContent>
            </Tabs>
            </div>
        </RoleGate>
    );
}
