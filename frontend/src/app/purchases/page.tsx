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
    CheckCircle2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PurchaseItem {
    id: string;
    productId: string;
    name: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
}

interface Product {
    id: string;
    name: string;
}

interface Supplier {
    id: string;
    name: string;
}

const API_BASE = "http://localhost:3001";

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // UI Feedback State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [supRes, prodRes] = await Promise.all([
                fetch(`${API_BASE}/parties?type=supplier`),
                fetch(`${API_BASE}/inventory/products`)
            ]);

            if (supRes.ok) setSuppliers(await supRes.json());
            if (prodRes.ok) setProducts(await prodRes.json());
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
            batchNumber: "",
            expiryDate: "",
            quantity: 1,
            purchasePrice: 0,
            salePrice: 0,
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
                    updated.name = products.find(p => p.id === value)?.name || "";
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
            if (item.salePrice <= 0) return "Sale price must be greater than 0.";
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: selectedSupplierId,
                    billNumber,
                    items: items.map(item => ({
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        expiryDate: new Date(item.expiryDate).toISOString(),
                        quantity: item.quantity,
                        purchasePrice: item.purchasePrice,
                        salePrice: item.salePrice
                    }))
                }),
            });

            if (response.ok) {
                setSuccess("Purchase recorded successfully! Stock has been updated.");
                setItems([]);
                setBillNumber("");
                setSelectedSupplierId("");
                // Refresh data to ensure we have latest state if needed
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
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Bill Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Supplier</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bill/Invoice Number</label>
                            <Input
                                placeholder="Enter Bill No."
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50">
                    <CardHeader>
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Purchase Items</CardTitle>
                    <div className="flex gap-2">
                        <span className="text-xs text-muted-foreground flex items-center bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                            <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                            Prices update batch data
                        </span>
                        <Button size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[200px]">Product</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">P.Price</TableHead>
                                <TableHead className="text-right">S.Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                        Click 'Add Item' to start recording stock entry.
                                    </TableCell>
                                </TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <select
                                            className="h-8 w-full text-xs bg-slate-50 border rounded px-1 max-w-[200px]"
                                            value={item.productId}
                                            onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                                        >
                                            <option value="">Select Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            className="h-8 w-24 text-xs"
                                            value={item.batchNumber}
                                            placeholder="Batch"
                                            onChange={(e) => updateItem(item.id, 'batchNumber', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="date"
                                            className="h-8 w-32 text-xs"
                                            value={item.expiryDate}
                                            onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            className="h-8 w-20 ml-auto text-right text-xs"
                                            value={item.quantity}
                                            min="1"
                                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            className="h-8 w-24 ml-auto text-right text-xs font-mono"
                                            value={item.purchasePrice}
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => updateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            className="h-8 w-24 ml-auto text-right text-xs font-mono"
                                            value={item.salePrice}
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => updateItem(item.id, 'salePrice', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-slate-700">
                                        ₹{(item.quantity * item.purchasePrice).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
