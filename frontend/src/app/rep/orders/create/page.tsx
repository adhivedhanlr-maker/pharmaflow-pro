"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
    Loader2,
    ShoppingCart,
    Package
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
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";

interface OrderItem {
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number; // Estimated price
    total: number;
    currentStock: number; // To show availability
    isBackorder: boolean;
}

interface Product {
    id: string;
    name: string;
    batches: Batch[];
}

interface Batch {
    id: string;
    currentStock: number;
    salePrice: number;
}

interface Customer {
    id: string;
    name: string;
    address: string;
    city: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TakeOrderPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Search states
    const [productSearch, setProductSearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        if (token) {
            fetchCustomers();
        }
    }, [token]);

    const fetchCustomers = async (search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('take', '50');

            const res = await fetch(`${API_BASE}/parties/customers?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.data || data);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async (search: string = "") => {
        setLoadingProducts(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('take', '50');

            const res = await fetch(`${API_BASE}/inventory/products?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data.data || data);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Debounce searches
    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) fetchProducts(productSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch, token]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) fetchCustomers(customerSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch, token]);

    const addItem = (product: Product) => {
        if (items.find(i => i.productId === product.id)) return;

        // Calculate total stock across all batches
        const totalStock = product.batches.reduce((sum, b) => sum + b.currentStock, 0);
        // Use highest sale price as estimate (or first batch)
        const estPrice = product.batches.length > 0 ? product.batches[0].salePrice : 0;

        const newItem: OrderItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            name: product.name,
            quantity: 1,
            unitPrice: estPrice,
            total: estPrice,
            currentStock: totalStock,
            isBackorder: totalStock < 1
        };
        setItems([...items, newItem]);
    };

    const updateItem = (id: string, quantity: number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, quantity);
                return {
                    ...item,
                    quantity: newQty,
                    total: newQty * item.unitPrice,
                    isBackorder: item.currentStock < newQty
                };
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId || items.length === 0) {
            alert("Please select a customer and add items.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                customerId: selectedCustomerId,
                totalAmount: items.reduce((sum, i) => sum + i.total, 0),
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    price: i.unitPrice
                }))
            };

            const res = await fetch(`${API_BASE}/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Order placed successfully!");
                setItems([]);
                setSelectedCustomerId("");
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || "Failed to place order"}`);
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

    return (
        <RoleGate allowedRoles={["SALES_REP", "ADMIN"]}>
            <div className="space-y-6 pb-20 md:pb-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Order</h1>
                        <p className="text-muted-foreground">Take a new order from a customer.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Customer & Items */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Selection */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Select Customer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Search customer..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        className="mb-2"
                                    />
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    >
                                        <option value="">-- Choose Customer --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} - {c.city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Order Items */}
                        <Card className="min-h-[400px] flex flex-col">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
                                <CardTitle className="text-base font-bold">Order Items</CardTitle>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[300px]" align="end">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search products..."
                                                value={productSearch}
                                                onValueChange={setProductSearch}
                                            />
                                            <CommandList>
                                                {loadingProducts ? (
                                                    <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                                ) : products.length === 0 ? (
                                                    <CommandEmpty>No products found.</CommandEmpty>
                                                ) : (
                                                    <CommandGroup>
                                                        {products.map(p => {
                                                            const totalStock = p.batches.reduce((sum, b) => sum + b.currentStock, 0);
                                                            return (
                                                                <CommandItem key={p.id} onSelect={() => addItem(p)} className="flex justify-between">
                                                                    <div className="truncate max-w-[180px]">{p.name}</div>
                                                                    <div className={`text-xs ${totalStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Product</TableHead>
                                            <TableHead className="text-center">Stock</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                    No items added.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.name}</div>
                                                        {item.isBackorder && (
                                                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1 rounded">
                                                                Backorder
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        <Badge variant={item.currentStock > 0 ? "outline" : "destructive"}>
                                                            {item.currentStock}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItem(item.id, item.quantity - 1)}>-</Button>
                                                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItem(item.id, item.quantity + 1)}>+</Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        ₹{item.total.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4 border-slate-200 shadow-lg bg-slate-50/50">
                            <CardHeader className="pb-2 border-b">
                                <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items</span>
                                        <span className="font-medium">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                                        <span>Total Est. Amount</span>
                                        <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={handleSubmit}
                                    disabled={isSaving || items.length === 0}
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Package className="mr-2 h-5 w-5" />}
                                    Place Order
                                </Button>
                                <p className="text-xs text-center text-muted-foreground px-4">
                                    Orders will be sent to the warehouse for processing. Stock availability is real-time.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </RoleGate>
    );
}
