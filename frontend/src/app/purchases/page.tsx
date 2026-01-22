"use client";

import { useState } from "react";
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
    Calendar as CalendarIcon
} from "lucide-react";

interface PurchaseItem {
    id: string;
    productId: string;
    name: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    total: number;
}

export default function PurchasesPage() {
    const [supplier, setSupplier] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [items, setItems] = useState<PurchaseItem[]>([]);

    const addItem = () => {
        const newItem: PurchaseItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: "",
            name: "Select Product",
            batchNumber: "",
            expiryDate: "",
            quantity: 0,
            purchasePrice: 0,
            salePrice: 0,
            total: 0,
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
                if (field === 'quantity' || field === 'purchasePrice') {
                    updated.total = updated.quantity * updated.purchasePrice;
                }
                return updated;
            }
            return item;
        }));
    };

    const totalBill = items.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Purchase Entry (GRN)</h1>
                    <p className="text-muted-foreground">Record stock arrival from suppliers.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Import CSV</Button>
                    <Button><Save className="mr-2 h-4 w-4" /> Save Purchase (F12)</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Bill Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Supplier</label>
                            <Input
                                placeholder="Search Supplier..."
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                            />
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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Gross Amount:</span>
                            <span className="font-mono">₹{totalBill.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax Total:</span>
                            <span className="font-mono">₹{(totalBill * 0.12).toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between items-center font-bold">
                            <span>Net Total:</span>
                            <span className="text-xl font-black text-primary font-mono">₹{(totalBill * 1.12).toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Purchase Items</CardTitle>
                    <Button size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
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
                                        Click 'Add Item' to start recording.
                                    </TableCell>
                                </TableRow>
                            ) : items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Input className="h-8 w-[200px]" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input className="h-8 w-24" value={item.batchNumber} onChange={(e) => updateItem(item.id, 'batchNumber', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="month" className="h-8 w-32" value={item.expiryDate} onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input type="number" className="h-8 w-20 ml-auto text-right" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input type="number" className="h-8 w-24 ml-auto text-right" value={item.purchasePrice} onChange={(e) => updateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input type="number" className="h-8 w-24 ml-auto text-right" value={item.salePrice} onChange={(e) => updateItem(item.id, 'salePrice', parseFloat(e.target.value) || 0)} />
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        ₹{item.total.toFixed(2)}
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
