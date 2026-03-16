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
    UserPlus
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PURCHASE_DRAFT_STORAGE_KEY = "purchase_draft_v2";

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSupplierDialog, setShowSupplierDialog] = useState(false);

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
        // Clear alerts after 5 seconds
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
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
                    updated.name = product?.name || "";
                    updated.composition = product?.composition || "";
                    updated.packing = product?.packing || "";
                }
                return updated;
            }
            return item;
        }));
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const tax = subtotal * 0.12; // Assuming 12% GST
        return { subtotal, tax, net: subtotal + tax };
    }, [items]);

    const validateForm = () => {
        if (!selectedSupplierId) return "Please select a supplier.";
        if (!billNumber.trim()) return "Please enter a bill number.";
        if (items.length === 0) return "Please add at least one item.";

        for (const item of items) {
            if (!item.productId) return "All items must have a product selected.";
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
                        productId: item.productId,
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
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Purchase Entry (GRN)</h1>
                        <p className="text-muted-foreground">Record stock arrival from suppliers.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Import CSV</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Bill Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Supplier</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <Button 
                                        variant="outline" 
                                        className="h-10 px-3 shrink-0 border-primary/20 text-primary hover:bg-primary/5"
                                        onClick={() => setShowSupplierDialog(true)}
                                        title="Add New Supplier"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Bill/Invoice Number</label>
                                <Input
                                    className="h-10 border-slate-200 font-mono"
                                    placeholder="Enter Bill No."
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                />
                            </div>

                            <div className="hidden md:flex flex-col justify-end pb-1 italic text-[10px] text-muted-foreground">
                                * Ensure bill details match the physical invoice.
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-sm">Gross Amount:</span>
                                <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-sm">Tax Total (12%):</span>
                                <span className="font-mono font-semibold">₹{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-200 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Net Total:</span>
                                <span className="text-2xl font-black text-primary font-mono">₹{totals.net.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item Entry Details</CardTitle>
                        <div className="flex gap-2 items-center">
                            <AddProductDialog onProductAdded={fetchData} />
                            <Button size="sm" onClick={addItem} className="h-9 px-4">
                                <Plus className="mr-2 h-4 w-4" /> Add Item
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
                                            <select
                                                className="h-8 w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 focus:ring-1 focus:ring-primary outline-none"
                                                value={item.productId}
                                                onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                                            >
                                                <option value="">Select Item</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
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
                                                value={item.quantity}
                                                min="1"
                                                onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 0))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono"
                                                value={item.purchasePrice}
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => updateItem(item.id, 'purchasePrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-blue-600"
                                                value={item.ptr}
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => updateItem(item.id, 'ptr', Math.max(0, parseFloat(e.target.value) || 0))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-green-600"
                                                value={item.pts}
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => updateItem(item.id, 'pts', Math.max(0, parseFloat(e.target.value) || 0))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="h-8 w-20 ml-auto text-right text-[11px] font-mono text-orange-600"
                                                value={item.nr}
                                                min="0"
                                                step="0.01"
                                                onChange={(e) => updateItem(item.id, 'nr', Math.max(0, parseFloat(e.target.value) || 0))}
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
                    
                    <div className="p-4 border-t flex justify-end bg-slate-50/30">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 font-medium uppercase tracking-wider">Gross Total</span>
                                <span className="font-mono font-bold text-slate-700">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 font-medium uppercase tracking-wider">GST (12%)</span>
                                <span className="font-mono font-bold text-slate-700">₹{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm font-black uppercase tracking-tighter">Net Payable</span>
                                <span className="text-xl font-black text-primary font-mono tracking-tighter">₹{totals.net.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
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
