"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Printer, Loader2, ShoppingCart, ShieldAlert, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InvoicePrint } from "@/components/billing/invoice-print";
import { CustomerDialog } from "@/components/billing/customer-dialog";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { BarcodeScanner } from "@/components/barcode/barcode-scanner";

interface BillingItem {
    id: string;
    productId: string;
    name: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    freeQuantity: number;
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
    const [extraDiscount, setExtraDiscount] = useState(0);
    const searchParams = useSearchParams();

    useEffect(() => {
        const customerId = searchParams.get("customerId");
        if (customerId) setSelectedCustomerId(customerId);
    }, [searchParams]);

    useEffect(() => {
        if (token) {
            void fetchCustomers();
            void fetchBusinessProfile();
        }
    }, [token]);

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

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const gst = items.reduce((acc, item) => acc + item.gstAmount, 0);
        const bulkDiscount = items.reduce((acc, item) => acc + ((item.freeQuantity || 0) * item.unitPrice), 0);
        const discount = bulkDiscount + extraDiscount;
        return { subtotal, gst, discount, net: Math.max(0, subtotal + gst - discount) };
    }, [items, extraDiscount]);

    const handleSave = async () => {
        if (!selectedCustomerId) return alert("Please select a customer");
        if (items.length === 0) return alert("Please add items to the invoice");

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
                    items: items.map(item => ({
                        productId: item.productId,
                        batchId: item.batchId,
                        quantity: item.quantity + (item.freeQuantity || 0)
                    })),
                    paymentMethod,
                    discountAmount: totals.discount,
                }),
            });

            if (response.ok) {
                alert("Invoice saved successfully!");
                setItems([]);
                setSelectedCustomerId("");
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
                void handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const addItem = (product: Product) => {
        const defaultBatch = product.batches[0];
        if (!defaultBatch) return;

        setItems([
            ...items,
            {
                id: Math.random().toString(36).slice(2, 11),
                productId: product.id,
                name: product.name,
                batchId: defaultBatch.id,
                batchNumber: defaultBatch.batchNumber,
                quantity: 1,
                freeQuantity: 0,
                unitPrice: defaultBatch.salePrice,
                gstRate: product.gstRate,
                gstAmount: (defaultBatch.salePrice * product.gstRate) / 100,
                total: defaultBatch.salePrice,
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
                    updated.unitPrice = batch.salePrice;
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

    const handlePrint = () => {
        if (!selectedCustomerId || items.length === 0) {
            alert("Please select a customer and add items before printing.");
            return;
        }
        window.print();
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const printCustomer = selectedCustomer
        ? { name: selectedCustomer.name, address: "Address on file", gstin: selectedCustomer.gstin }
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
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
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
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            ) : (
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
                                <CardContent className="space-y-3">
                                    <Input placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                                                <option value="">Select Customer</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.gstin}</option>)}
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
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button size="sm" id="add-item-trigger"><Plus className="mr-2 h-4 w-4" /> Add Item (F2)</Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0" side="bottom" align="end">
                                                <Command>
                                                    <CommandInput placeholder="Search product..." value={productSearch} onValueChange={setProductSearch} />
                                                    <CommandList>
                                                        {loadingProducts ? (
                                                            <div className="py-6 text-center text-sm"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
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
                                            <Camera className="mr-2 h-4 w-4" /> Scan Barcode
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead className="w-[50px]">Sr.</TableHead>
                                                    <TableHead className="w-[300px]">Product Name</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                    <TableHead className="text-right">Free</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                    <TableHead className="text-right">GST %</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ShoppingCart className="h-8 w-8 opacity-20" />
                                                                <p>No items added yet. Search products to add.</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : items.map((item, index) => (
                                                    <TableRow key={item.id} className="hover:bg-slate-50/30">
                                                        <TableCell className="text-slate-500 font-medium">{index + 1}</TableCell>
                                                        <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                                                        <TableCell>
                                                            <select className="text-xs font-semibold bg-slate-100 rounded px-2 py-1 border-none" value={item.batchId} onChange={(e) => updateItem(item.id, "batchId", e.target.value)}>
                                                                {products.find(p => p.id === item.productId)?.batches.map(b => <option key={b.id} value={b.id}>{b.batchNumber} (Stock: {b.currentStock})</option>)}
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="text-right"><Input type="number" className="h-8 w-20 ml-auto text-right font-semibold" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)} /></TableCell>
                                                        <TableCell className="text-right"><Input type="number" className="h-8 w-16 ml-auto text-right font-semibold text-green-600 bg-green-50" placeholder="0" value={item.freeQuantity} onChange={(e) => updateItem(item.id, "freeQuantity", parseInt(e.target.value) || 0)} /></TableCell>
                                                        <TableCell className="text-right font-mono text-slate-600">Rs {item.unitPrice.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right p-4 font-mono text-sm text-slate-400">{item.gstRate}%</TableCell>
                                                        <TableCell className="text-right font-black font-mono text-slate-900">Rs {(item.total + item.gstAmount).toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal:</span><span className="font-mono">Rs {totals.subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Total GST:</span><span className="font-mono">Rs {totals.gst.toFixed(2)}</span></div>
                                    <div className="space-y-2 border-b border-slate-800 pb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Extra Discount:</span>
                                            <Input
                                                type="number"
                                                className="h-7 w-20 bg-slate-800 border-slate-700 text-right text-xs"
                                                value={extraDiscount}
                                                onChange={(e) => setExtraDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Total Discount:</span>
                                            <span className="font-mono text-red-400">-Rs {totals.discount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold uppercase text-slate-500">Payment Mode</span>
                                        <div className="grid grid-cols-2 gap-1 px-1">
                                            {["CASH", "UPI", "CARD", "CREDIT"].map(mode => (
                                                <Button
                                                    key={mode}
                                                    size="sm"
                                                    variant={paymentMethod === mode ? "default" : "outline"}
                                                    className={paymentMethod === mode ? "bg-blue-600 h-8 text-[10px]" : "h-8 text-[10px] border-slate-700 text-slate-300"}
                                                    onClick={() => setPaymentMethod(mode)}
                                                >
                                                    {mode}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-between items-end"><span className="text-sm font-bold uppercase text-slate-400">Net Payable</span><span className="text-3xl font-black text-blue-400 font-mono">Rs {totals.net.toFixed(2)}</span></div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            <InvoicePrint
                invoiceNumber="DRAFT-001"
                date={new Date()}
                businessProfile={businessProfile}
                customer={printCustomer}
                items={items.map(item => ({
                    id: item.id,
                    name: item.name,
                    batchNumber: item.batchNumber,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    freeQuantity: item.freeQuantity || 0,
                    gstRate: item.gstRate,
                    gstAmount: item.gstAmount,
                    total: item.total
                }))}
                totals={totals}
            />
            <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
        </RoleGate>
    );
}
