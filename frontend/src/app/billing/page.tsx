"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Search,
    Plus,
    Trash2,
    Save,
    Printer,
    ChevronRight,
    Loader2,
    ShoppingCart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { InvoicePrint } from "@/components/billing/invoice-print";
import { CustomerDialog } from "@/components/billing/customer-dialog";

interface BillingItem {
    id: string;
    productId: string;
    name: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    total: number;
}

interface Product {
    id: string;
    name: string;
    gstRate: number;
    batches: Batch[];
}

interface Batch {
    id: string;
    batchNumber: string;
    currentStock: number;
    salePrice: number;
    expiryDate: string;
}

interface Customer {
    id: string;
    name: string;
    gstin: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BillingPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [items, setItems] = useState<BillingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const custRes = await fetch(`${API_BASE}/parties?type=customer`);
            const prodRes = await fetch(`${API_BASE}/inventory/products`);
            if (custRes.ok) setCustomers(await custRes.json());
            if (prodRes.ok) setProducts(await prodRes.json());
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCustomerId) {
            alert("Please select a customer");
            return;
        }
        if (items.length === 0) {
            alert("Please add items to the invoice");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/sales/invoices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: selectedCustomerId,
                    items: items.map(item => ({
                        productId: item.productId,
                        batchId: item.batchId,
                        quantity: item.quantity
                    })),
                    isCash: true,
                    discountAmount: 0
                }),
            });

            if (response.ok) {
                const sale = await response.json();
                alert("Invoice saved successfully!");
                setItems([]);
                setSelectedCustomerId("");
                // Trigger print here if needed
            } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
            }
        } catch (error) {
            alert("Failed to save invoice");
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard Shortcuts
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
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]); // Re-bind if save logic changes (usually stable)

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const gst = items.reduce((acc, item) => acc + item.gstAmount, 0);
        return {
            subtotal,
            gst,
            net: subtotal + gst,
        };
    }, [items]);

    const addItem = (product: Product) => {
        const defaultBatch = product.batches[0];
        if (!defaultBatch) return;

        const newItem: BillingItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            name: product.name,
            batchId: defaultBatch.id,
            batchNumber: defaultBatch.batchNumber,
            quantity: 1,
            unitPrice: defaultBatch.salePrice,
            gstRate: product.gstRate,
            gstAmount: (defaultBatch.salePrice * product.gstRate) / 100,
            total: defaultBatch.salePrice,
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof BillingItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // If batch changes, update price
                if (field === 'batchId') {
                    const product = products.find(p => p.id === item.productId);
                    const batch = product?.batches.find(b => b.id === value);
                    if (batch) {
                        updated.batchNumber = batch.batchNumber;
                        updated.unitPrice = batch.salePrice;
                    }
                }

                updated.total = updated.quantity * updated.unitPrice;
                updated.gstAmount = (updated.total * updated.gstRate) / 100;
                return updated;
            }
            return item;
        }));
    };

    // handleSave was here, moved up.

    const handlePrint = () => {
        if (!selectedCustomerId || items.length === 0) {
            alert("Please select a customer and add items before printing.");
            return;
        }
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Find selected customer details for the invoice
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    // Create a safe default for the invoice component if no customer is selected yet (though logic prevents print)
    const printCustomer = selectedCustomer ? {
        name: selectedCustomer.name,
        address: "Address on file", // Add address to customer interface if needed later
        gstin: selectedCustomer.gstin,
    } : { name: "", address: "" };

    return (
        <>
            <div className="space-y-6 no-print">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Generate Invoice</h1>
                        <p className="text-muted-foreground">Create a new sales invoice for a customer.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print Proforma</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Invoice (F12)
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20 md:pb-0">
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Customer Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={selectedCustomerId}
                                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.gstin}</option>
                                            ))}
                                        </select>
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
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Invoice Items</CardTitle>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button size="sm" id="add-item-trigger"><Plus className="mr-2 h-4 w-4" /> Add Item (F2)</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0" side="bottom" align="end">
                                        <Command>
                                            <CommandInput placeholder="Search product..." />
                                            <CommandList>
                                                <CommandEmpty>No product found.</CommandEmpty>
                                                <CommandGroup>
                                                    {products.map((p) => (
                                                        <CommandItem
                                                            key={p.id}
                                                            onSelect={() => addItem(p)}
                                                            className="flex justify-between"
                                                        >
                                                            <span>{p.name}</span>
                                                            <span className="text-xs text-muted-foreground">GST: {p.gstRate}%</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead className="w-[300px]">Product Name</TableHead>
                                                <TableHead>Batch</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">GST %</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <ShoppingCart className="h-8 w-8 opacity-20" />
                                                            <p>No items added yet. Search products to add.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : items.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-slate-50/30">
                                                    <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                                                    <TableCell>
                                                        <select
                                                            className="text-xs font-semibold bg-slate-100 rounded px-2 py-1 border-none focus:ring-1 focus:ring-primary"
                                                            value={item.batchId}
                                                            onChange={(e) => updateItem(item.id, 'batchId', e.target.value)}
                                                        >
                                                            {products.find(p => p.id === item.productId)?.batches.map(b => (
                                                                <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.currentStock})</option>
                                                            ))}
                                                        </select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-20 ml-auto text-right font-semibold"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-slate-600">
                                                        ₹{item.unitPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right p-4 font-mono text-sm text-slate-400">
                                                        {item.gstRate}%
                                                    </TableCell>
                                                    <TableCell className="text-right font-black font-mono text-slate-900">
                                                        ₹{(item.total + item.gstAmount).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4 p-4 bg-slate-50">
                                    {items.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground bg-white rounded-lg border border-dashed">
                                            <ShoppingCart className="h-8 w-8 opacity-20 mx-auto mb-2" />
                                            <p>No items added yet</p>
                                        </div>
                                    ) : items.map((item) => (
                                        <div key={item.id} className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                                                    <div className="ttext-xs text-slate-500 mt-1 flex gap-2">
                                                        <Badge variant="outline" className="text-[10px] h-5">Batch: {item.batchNumber}</Badge>
                                                        <Badge variant="secondary" className="text-[10px] h-5">GST: {item.gstRate}%</Badge>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive -mt-2 -mr-2"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-md">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-xs font-semibold text-slate-500">Qty:</span>
                                                    <Button
                                                        variant="outline" size="icon" className="h-7 w-7 bg-white"
                                                        onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                                    >
                                                        -
                                                    </Button>
                                                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                                                    <Button
                                                        variant="outline" size="icon" className="h-7 w-7 bg-white"
                                                        onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400">Total</div>
                                                    <div className="font-bold font-mono">₹{(item.total + item.gstAmount).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-slate-900 text-white border-none shadow-xl hidden md:block">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Bill Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal:</span>
                                    <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total GST:</span>
                                    <span className="font-mono">₹{totals.gst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-b border-slate-800 pb-4">
                                    <span className="text-slate-400">Discount:</span>
                                    <span className="font-mono text-red-400">-₹0.00</span>
                                </div>
                                <div className="pt-2 flex justify-between items-end">
                                    <span className="text-sm font-bold uppercase text-slate-400">Net Payable</span>
                                    <span className="text-3xl font-black text-blue-400 font-mono">₹{totals.net.toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mobile Sticky Footer for Summary */}
                        <div className="md:hidden fixed bottom-[60px] left-0 right-0 bg-slate-900 text-white p-4 border-t border-slate-800 flex justify-between items-center z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.1)]">
                            <div>
                                <div className="text-xs text-slate-400 uppercase">Net Payable</div>
                                <div className="text-xl font-black text-blue-400 font-mono">₹{totals.net.toFixed(2)}</div>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-blue-600 hover:bg-blue-500">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                            </Button>
                        </div>

                        <Card className="border-slate-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xs font-bold uppercase text-slate-500">Payment Mode</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Button variant="default" className="flex-1 h-12 text-xs font-bold uppercase">Cash</Button>
                                <Button variant="outline" className="flex-1 h-12 text-xs font-bold uppercase">Credit</Button>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
                            <h4 className="text-xs font-bold text-amber-800">Shortcut Keys:</h4>
                            <ul className="text-[10px] text-amber-700 grid grid-cols-2 gap-1">
                                <li><span className="font-bold">F2:</span> Add Item</li>
                                <li><span className="font-bold">F12:</span> Save</li>
                                <li><span className="font-bold">F10:</span> Print</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Print Component - Only visible during print */}
            <InvoicePrint
                invoiceNumber="DRAFT-001"
                date={new Date()}
                customer={printCustomer}
                items={items.map(item => ({
                    id: item.id,
                    name: item.name,
                    batchNumber: item.batchNumber,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    gstRate: item.gstRate,
                    gstAmount: item.gstAmount,
                    total: item.total
                }))}
                totals={totals}
            />
        </>
    );
}
