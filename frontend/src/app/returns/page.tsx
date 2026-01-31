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
import { Plus, Search, Filter, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, ArrowLeftRight } from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ReturnsPage() {
    const [activeTab, setActiveTab] = useState("sales");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [transaction, setTransaction] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError("Please enter an invoice/bill number");
            return;
        }

        setLoading(true);
        setError(null);
        setTransaction(null);
        setReturnItems([]);

        try {
            const endpoint = activeTab === "sales"
                ? `/returns/sales/${searchQuery}`
                : `/returns/purchase/${searchQuery}`;

            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTransaction(data);
                // Initialize return items with zero quantities
                setReturnItems(data.items.map((item: any) => ({
                    ...item,
                    returnQuantity: 0,
                    reason: ""
                })));
            } else {
                setError(`${activeTab === "sales" ? "Invoice" : "Bill"} not found`);
            }
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const updateReturnQuantity = (index: number, quantity: number) => {
        const updated = [...returnItems];
        updated[index].returnQuantity = Math.min(quantity, updated[index].quantity);
        setReturnItems(updated);
    };

    const updateReason = (index: number, reason: string) => {
        const updated = [...returnItems];
        updated[index].reason = reason;
        setReturnItems(updated);
    };

    const handleSubmitReturn = async () => {
        const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);

        if (itemsToReturn.length === 0) {
            setError("Please select at least one item to return");
            return;
        }

        // Validate reasons
        for (const item of itemsToReturn) {
            if (!item.reason.trim()) {
                setError("Please provide a reason for all items being returned");
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const endpoint = activeTab === "sales" ? "/returns/sales" : "/returns/purchase";
            const payload = activeTab === "sales"
                ? {
                    saleId: transaction.id,
                    items: itemsToReturn.map(item => ({
                        saleItemId: item.id,
                        quantity: item.returnQuantity,
                        reason: item.reason
                    }))
                }
                : {
                    purchaseId: transaction.id,
                    items: itemsToReturn.map(item => ({
                        purchaseItemId: item.id,
                        quantity: item.returnQuantity,
                        reason: item.reason
                    }))
                };

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSuccess(`${activeTab === "sales" ? "Credit Note" : "Debit Note"} created successfully!`);
                setTransaction(null);
                setReturnItems([]);
                setSearchQuery("");
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Failed to process return");
            }
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const totalReturnAmount = returnItems.reduce((sum, item) => {
        return sum + (item.returnQuantity * (item.unitPrice || item.purchasePrice || 0));
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Returns & Reversals</h1>
                    <p className="text-muted-foreground">Process sales returns (Credit Notes) and purchase returns (Debit Notes).</p>
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="sales">Sales Returns</TabsTrigger>
                    <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Enter ${activeTab === "sales" ? "Invoice" : "Bill"} Number...`}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Find Transaction
                    </Button>
                </div>

                <TabsContent value="sales">
                    {transaction ? (
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg font-bold flex items-center justify-between">
                                    <span className="flex items-center">
                                        <RefreshCw className="mr-2 h-5 w-5 text-blue-600" />
                                        Sales Return - {transaction.invoiceNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground">Customer: {transaction.customer?.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Batch</TableHead>
                                            <TableHead className="text-right">Sold Qty</TableHead>
                                            <TableHead className="text-right">Return Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead>Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnItems.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.batch?.product?.name}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.batch?.batchNumber}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-20 ml-auto text-right"
                                                        value={item.returnQuantity}
                                                        max={item.quantity}
                                                        min={0}
                                                        onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono">₹{item.unitPrice?.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Reason..."
                                                        className="h-8"
                                                        value={item.reason}
                                                        onChange={(e) => updateReason(index, e.target.value)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                                    <div className="text-lg font-bold">
                                        Total Return Amount: <span className="text-red-600">₹{totalReturnAmount.toFixed(2)}</span>
                                    </div>
                                    <Button onClick={handleSubmitReturn} disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Process Credit Note
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter an invoice number above to load items for return.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="purchase">
                    {transaction ? (
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg font-bold flex items-center justify-between">
                                    <span className="flex items-center">
                                        <ArrowLeftRight className="mr-2 h-5 w-5 text-orange-600" />
                                        Purchase Return - {transaction.billNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground">Supplier: {transaction.supplier?.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Batch</TableHead>
                                            <TableHead className="text-right">Purchased Qty</TableHead>
                                            <TableHead className="text-right">Return Qty</TableHead>
                                            <TableHead className="text-right">Purchase Price</TableHead>
                                            <TableHead>Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnItems.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.batch?.product?.name}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.batch?.batchNumber}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="h-8 w-20 ml-auto text-right"
                                                        value={item.returnQuantity}
                                                        max={item.quantity}
                                                        min={0}
                                                        onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono">₹{item.purchasePrice?.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Reason..."
                                                        className="h-8"
                                                        value={item.reason}
                                                        onChange={(e) => updateReason(index, e.target.value)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                                    <div className="text-lg font-bold">
                                        Total Return Amount: <span className="text-red-600">₹{totalReturnAmount.toFixed(2)}</span>
                                    </div>
                                    <Button onClick={handleSubmitReturn} disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Process Debit Note
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>Enter a purchase bill number above to load items for return.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
