"use client";

import { useState, useMemo } from "react";
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
    ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BillingItem {
    id: string;
    productId: string;
    name: string;
    batchId?: string;
    batchNumber?: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    total: number;
}

export default function BillingPage() {
    const [customer, setCustomer] = useState("");
    const [items, setItems] = useState<BillingItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const totals = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const gst = items.reduce((acc, item) => acc + item.gstAmount, 0);
        return {
            subtotal,
            gst,
            net: subtotal + gst,
        };
    }, [items]);

    const addItem = () => {
        const newItem: BillingItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: "",
            name: "Select Product",
            quantity: 1,
            unitPrice: 0,
            gstRate: 12,
            gstAmount: 0,
            total: 0,
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
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.total = updated.quantity * updated.unitPrice;
                    updated.gstAmount = (updated.total * updated.gstRate) / 100;
                }
                return updated;
            }
            return item;
        }));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Generate Invoice</h1>
                    <p className="text-muted-foreground">Create a new sales invoice for a customer.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print Proforma</Button>
                    <Button><Save className="mr-2 h-4 w-4" /> Save Invoice (F12)</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search Customer (Name/GSTIN/Mobile)"
                                        value={customer}
                                        onChange={(e) => setCustomer(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline">New Customer</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-sm font-medium">Invoice Items</CardTitle>
                            <Button size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add Item (F2)</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
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
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                No items added yet. Click 'Add Item' or press F2.
                                            </TableCell>
                                        </TableRow>
                                    ) : items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Input
                                                    className="h-8 border-none focus-visible:ring-0 px-0 font-medium"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                                    Select Batch <ChevronRight className="ml-1 h-3 w-3" />
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="h-8 w-20 ml-auto text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24 ml-auto text-right font-mono"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right p-4 font-mono text-sm text-muted-foreground">
                                                {item.gstRate}%
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono">
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
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Bill Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total GST:</span>
                                <span className="font-mono">₹{totals.gst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Discount:</span>
                                <span className="font-mono text-red-600">-₹0.00</span>
                            </div>
                            <div className="h-px bg-primary/20 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Net Total:</span>
                                <span className="text-2xl font-black text-primary font-mono">₹{totals.net.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Button variant="default" className="flex-1">Cash</Button>
                            <Button variant="outline" className="flex-1">Credit</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
