"use client";

import { useState, useEffect } from "react";
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
    Search,
    Filter,
    AlertTriangle,
    Loader2,
    Edit2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
    id: string;
    name: string;
    batches: {
        id: string;
        batchNumber: string;
        expiryDate: string;
        currentStock: number;
        salePrice: number;
    }[];
}

const API_BASE = "http://localhost:3001";

import { cn } from "@/lib/utils";

export default function StockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/inventory/products`);
            if (response.ok) {
                setProducts(await response.json());
            }
        } catch (error) {
            console.error("Failed to fetch stock:", error);
        } finally {
            setLoading(false);
        }
    };

    const allBatches = products.flatMap(p =>
        p.batches.map(b => ({
            ...b,
            productName: p.name,
            id: b.id // ensure we have unique id
        }))
    ).filter(b =>
        b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (stock: number, expiry: string) => {
        const expDate = new Date(expiry);
        const today = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(today.getMonth() + 3);

        if (expDate < today) return <Badge variant="destructive">Expired</Badge>;
        if (stock <= 10) return <Badge variant="destructive">Low Stock</Badge>;
        if (expDate < threeMonths) return <Badge variant="outline" className="text-orange-600 border-orange-200">Expiring Soon</Badge>;
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Healthy</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock Inventory</h1>
                    <p className="text-muted-foreground">View and manage all pharmaceutical batches.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Export Report</Button>
                    <Button variant="outline" onClick={fetchStock}>
                        <Loader2 className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Batch Visibility</CardTitle>
                    <div className="relative w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products/batches..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">S.Price</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell>
                                </TableRow>
                            ) : allBatches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">No stock matching your search.</TableCell>
                                </TableRow>
                            ) : allBatches.map((b, idx) => (
                                <TableRow key={`${b.id}-${idx}`}>
                                    <TableCell className="font-medium text-primary">{b.productName}</TableCell>
                                    <TableCell className="font-mono">{b.batchNumber}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</TableCell>
                                    <TableCell className="text-right font-bold">{b.currentStock} Units</TableCell>
                                    <TableCell className="text-right font-mono">₹{b.salePrice.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">₹{(b.currentStock * b.salePrice).toLocaleString()}</TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(b.currentStock, b.expiryDate)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
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


