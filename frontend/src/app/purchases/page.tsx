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
    Upload
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
    packing: string;
    batchNumber: string;
    expiryDate: string; // YYYY-MM-DD
    quantity: number;
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
    packing?: string;
    gstRate: number;
}

interface Supplier {
    id: string;
    name: string;
}

interface ExtractedInvoiceItem {
    name?: string;
    composition?: string;
    pack?: string;
    batch?: string;
    expiry?: string;
    quantity?: number;
    ptr?: number;
    mrp?: number;
    pts?: number;
    nr?: number;
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

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSupplierDialog, setShowSupplierDialog] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [gstPercent, setGstPercent] = useState(5); // Default to 5% as per user request

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
            setItems(Array.isArray(draft.items) ? draft.items : []);
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

    const addItem = () => {
        const newItem: PurchaseItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: "",
            name: "",
            composition: "",
            packing: "",
            batchNumber: "",
            expiryDate: "",
            quantity: 1,
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
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'productId') {
                    const product = products.find(p => p.id === value);
                    if (product) {
                        updated.name = product.name;
                        updated.composition = product.composition || "";
                        updated.packing = product.packing || "";
                        // If it's a newly added product, we might want to keep the invoice price/batch
                        // unless specifically updated.
                    }
                }
                return updated;
            }
            return item;
        }));
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * (item.purchasePrice || 0)), 0);
        const tax = subtotal * (gstPercent / 100);
        return { subtotal, tax, net: subtotal + tax };
    }, [items, gstPercent]);

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
            const response = await fetch(`${API_BASE}/purchases`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    supplierId: selectedSupplierId,
                    billNumber,
                    items: items.map(item => ({
                        productId: item.productId || undefined,
                        name: item.name,
                        composition: item.composition,
                        packing: item.packing,
                        batchNumber: item.batchNumber,
                        expiryDate: new Date(item.expiryDate).toISOString(),
                        quantity: item.quantity,
                        purchasePrice: item.purchasePrice,
                        salePrice: item.salePrice,
                        ptr: item.ptr,
                        pts: item.pts,
                        nr: item.nr
                    }))
                }),
            });

            if (response.ok) {
                setSuccess("Purchase recorded successfully! Stock has been updated.");
                setItems([]);
                setBillNumber("");
                setSelectedSupplierId("");
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

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    productId: product?.id || "",
                    name: item.name || "",
                    composition: item.composition || "",
                    packing: item.pack || "",
                    batchNumber: item.batch || "",
                    expiryDate: item.expiry || "",
                    quantity: item.quantity || 1,
                    purchasePrice: item.ptr || 0,
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
            setError(`AI extraction error: ${displayMsg}`);
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
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div 
                className="p-6 space-y-6 max-w-7xl mx-auto relative min-h-[85vh]"
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Purchase Entry (GRN)</h1>
                        <p className="text-muted-foreground">Record stock arrival from suppliers.</p>
                    </div>
                    <div className="flex gap-2">
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
                            className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                            onClick={() => document.getElementById('invoice-upload')?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4 mr-2" />
                            )}
                            Upload Invoice (AI)
                        </Button>
                        <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Import CSV</Button>
                        <Button onClick={handleSave} disabled={isUploading || isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Purchase
                        </Button>
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
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col lg:flex-row gap-4">
                    <Card className="flex-1">
                        <CardHeader className="py-2 px-4 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bill Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                                <div className="space-y-1.5 min-w-[280px] flex-1">
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

                                <div className="space-y-1.5 w-full sm:w-48">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Invoice Number</label>
                                    <Input
                                        className="h-9 border-slate-200 font-mono text-sm"
                                        placeholder="Enter Bill No."
                                        value={billNumber}
                                        onChange={(e) => setBillNumber(e.target.value)}
                                    />
                                </div>

                                <div className="hidden xl:block pb-1 italic text-[10px] text-muted-foreground ml-auto">
                                    * Ensure details match physical invoice
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:w-80 bg-slate-50 border-dashed">
                        <CardHeader className="py-2 px-4 border-b">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-tight">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Gross:</span>
                                <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-slate-500">Tax</span>
                                    <input 
                                        type="number" 
                                        className="w-8 bg-transparent border-none p-0 text-[10px] font-bold text-slate-600 focus:ring-0 text-center"
                                        value={gstPercent}
                                        onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">%</span>
                                </div>
                                <span className="font-mono font-semibold">₹{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200 pt-1 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Bill:</span>
                                <span className="text-lg font-black text-primary font-mono tracking-tighter">₹{totals.net.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-tight">Item Entry Details</CardTitle>
                        <div className="flex gap-2 items-center">
                            <AddProductDialog onProductAdded={fetchData} />
                            <Button size="sm" onClick={addItem} className="h-8 px-3 text-xs">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 border-t overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="w-12 text-center text-[10px] font-bold uppercase">S NO</TableHead>
                                    <TableHead className="w-[180px] text-[10px] font-bold uppercase">BRAND NAME</TableHead>
                                    <TableHead className="w-[180px] text-[10px] font-bold uppercase">COMPO</TableHead>
                                    <TableHead className="w-[100px] text-[10px] font-bold uppercase">PACKING</TableHead>
                                    <TableHead className="w-[100px] text-[10px] font-bold uppercase">BATCH NO</TableHead>
                                    <TableHead className="w-[120px] text-[10px] font-bold uppercase">EXPIRY</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">QTY</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">MRP</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">PTR</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">PTS</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">NR</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground italic text-sm">
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
                                                onChange={(e) => updateItem(item.id, 'composition', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] bg-slate-50"
                                                value={item.packing}
                                                placeholder="Packing"
                                                onChange={(e) => updateItem(item.id, 'packing', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-[11px] font-mono"
                                                value={item.batchNumber}
                                                placeholder="Batch"
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
                                                className="h-8 w-16 ml-auto text-right text-[11px] font-bold"
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
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono"
                                                value={item.purchasePrice === 0 ? "" : item.purchasePrice}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => {
                                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    updateItem(item.id, 'purchasePrice', isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-blue-600"
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
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-green-600"
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
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-orange-600"
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
        </RoleGate>
    );
}
