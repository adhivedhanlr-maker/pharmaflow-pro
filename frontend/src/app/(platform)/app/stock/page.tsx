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
    Search,
    Filter,
    AlertTriangle,
    Edit2,
    Trash2,
    ShieldAlert,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoleGate } from "@/components/auth/role-gate";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Product {
    id: string;
    name: string;
    company?: string;
    hsnCode?: string;
    mrp: number;
    batches: {
        id: string;
        batchNumber: string;
        expiryDate: string;
        currentStock: number;
        salePrice: number;
        ptr: number;
        pts: number;
        nr: number;
        purchasePrice: number;
        mrp: number;
        supplier?: { id: string; name: string } | null;
    }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EditStockDialog } from "@/components/stock/edit-stock-dialog";
import { AddStockDialog } from "@/components/stock/add-stock-dialog";
import { EditProductDialog } from "@/components/stock/edit-product-dialog";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";

export default function StockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingBatch, setEditingBatch] = useState<any>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("batches");

    type BatchSortField = 'productName' | 'batchNumber' | 'expiryDate' | 'currentStock';
    type ProductSortField = 'name' | 'company' | 'mrp' | 'batchesCount';
    type SortOrder = 'asc' | 'desc';

    const [batchSortConfig, setBatchSortConfig] = useState<{ field: BatchSortField, order: SortOrder }>({ field: 'productName', order: 'asc' });
    const [productSortConfig, setProductSortConfig] = useState<{ field: ProductSortField, order: SortOrder }>({ field: 'name', order: 'asc' });

    const handleBatchSort = (field: BatchSortField) => {
        if (batchSortConfig.field === field) {
            setBatchSortConfig({ field, order: batchSortConfig.order === 'asc' ? 'desc' : 'asc' });
        } else {
            setBatchSortConfig({ field, order: 'asc' });
        }
    };

    const handleProductSort = (field: ProductSortField) => {
        if (productSortConfig.field === field) {
            setProductSortConfig({ field, order: productSortConfig.order === 'asc' ? 'desc' : 'asc' });
        } else {
            setProductSortConfig({ field, order: 'asc' });
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/inventory/products`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (response.ok) {
                const result = await response.json();
                setProducts(result.data || result);
            }
        } catch (error) {
            console.error("Failed to fetch stock:", error);
        } finally {
            setLoading(false);
        }
    };

    const allBatches = useMemo(() => {
        if (!Array.isArray(products)) return [];
        let flat = products.flatMap(p =>
            p.batches.map(b => ({
                ...b,
                productName: p.name,
                id: b.id
            }))
        ).filter(b =>
            b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );

        flat.sort((a, b) => {
            let comparison = 0;
            switch (batchSortConfig.field) {
                case 'productName':
                    comparison = a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' });
                    break;
                case 'batchNumber':
                    comparison = a.batchNumber.localeCompare(b.batchNumber, undefined, { sensitivity: 'base' });
                    break;
                case 'expiryDate':
                    comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                    break;
                case 'currentStock':
                    comparison = a.currentStock - b.currentStock;
                    break;
            }
            return batchSortConfig.order === 'asc' ? comparison : -comparison;
        });

        return flat;
    }, [products, searchQuery, batchSortConfig]);

    const sortedProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];
        let filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (productSortConfig.field) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                    break;
                case 'company':
                    comparison = (a.company || '').localeCompare(b.company || '', undefined, { sensitivity: 'base' });
                    break;
                case 'mrp':
                    comparison = (a.mrp || 0) - (b.mrp || 0);
                    break;
                case 'batchesCount':
                    comparison = (a.batches?.length || 0) - (b.batches?.length || 0);
                    break;
            }
            return productSortConfig.order === 'asc' ? comparison : -comparison;
        });
        return filtered;
    }, [products, searchQuery, productSortConfig]);

    const renderSortIcon = (field: string, configField: string, order: SortOrder) => {
        if (field !== configField) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return order === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

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

    const handleDeleteBatch = async (batchId: string, batchNumber: string) => {
        if (!window.confirm(`Are you sure you want to delete Batch ${batchNumber}? this action cannot be undone.`)) return;

        try {
            const response = await fetch(`${API_BASE}/inventory/batches/${batchId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                toast.success("Batch deleted successfully");
                fetchStock();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to delete batch");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to connect to server");
        }
    };

    const handleDeleteProduct = async (productId: string, productName: string) => {
        if (!window.confirm(`Are you sure you want to delete Product "${productName}"? This will delete all its batches and cannot be undone.`)) return;

        try {
            const response = await fetch(`${API_BASE}/inventory/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                toast.success("Product deleted successfully");
                fetchStock();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to delete product");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to connect to server");
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
                        Inventory and stock management is restricted to authorized personnel.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-4 md:space-y-6 pb-24 md:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
                        <p className="text-muted-foreground">Manage batches and your product master database.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {activeTab === "products" ? (
                            <AddProductDialog
                                onProductAdded={fetchStock}
                                triggerLabel="Add Product"
                                triggerClassName="bg-blue-600 hover:bg-blue-700 text-white shadow-md border-none h-10 px-4"
                            />
                        ) : (
                            <AddStockDialog onSuccess={fetchStock} />
                        )}
                        <Button variant="outline" onClick={fetchStock} className="border-slate-200 h-10 px-4">
                            {loading
                                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                : <RefreshCw className="h-4 w-4 mr-2" />
                            }
                            Refresh
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <TabsList className="bg-slate-100 p-1 h-11 w-full sm:w-auto">
                            <TabsTrigger value="batches" className="h-9 px-4 sm:px-6 flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:shadow-sm">Stock Batches</TabsTrigger>
                            <TabsTrigger value="products" className="h-9 px-4 sm:px-6 flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:shadow-sm">Product Master</TabsTrigger>
                        </TabsList>
                        <div className="relative w-full sm:flex-1 sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={activeTab === "batches" ? "Search batch or product..." : "Search product master..."}
                                className="pl-9 h-11"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <TabsContent value="batches" className="mt-0">
                        <Card className="border shadow-sm">
                            <CardContent className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[60px]">Sr. No.</TableHead>
                                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleBatchSort('productName')}>
                                                <div className="flex items-center">Product Name {renderSortIcon('productName', batchSortConfig.field, batchSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleBatchSort('batchNumber')}>
                                                <div className="flex items-center">Batch No. {renderSortIcon('batchNumber', batchSortConfig.field, batchSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="text-[11px]">Supplier</TableHead>
                                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleBatchSort('expiryDate')}>
                                                <div className="flex items-center">Expiry {renderSortIcon('expiryDate', batchSortConfig.field, batchSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleBatchSort('currentStock')}>
                                                <div className="flex items-center justify-end">Current Stock {renderSortIcon('currentStock', batchSortConfig.field, batchSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="text-right">S.Price</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 8 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : allBatches.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">No stock matching your search.</TableCell>
                                            </TableRow>
                                        ) : allBatches.map((b, idx) => (
                                            <TableRow key={`${b.id}-${idx}`} className="hover:bg-slate-50/50">
                                                <TableCell className="text-slate-500">{idx + 1}</TableCell>
                                                <TableCell className="font-semibold text-blue-900">{b.productName}</TableCell>
                                                <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                                                <TableCell className="text-xs text-slate-500">{b.supplier?.name || <span className="italic text-slate-300">—</span>}</TableCell>
                                                <TableCell className="text-slate-500">{new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-700">{b.currentStock} Units</TableCell>
                                                <TableCell className="text-right font-mono">₹{b.salePrice.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">₹{(b.currentStock * b.salePrice).toLocaleString()}</TableCell>
                                                <TableCell className="text-center">
                                                    {getStatusBadge(b.currentStock, b.expiryDate)}
                                                </TableCell>
                                                <TableCell className="flex gap-1 justify-end items-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => {
                                                            setEditingBatch(b);
                                                            setEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteBatch(b.id, b.batchNumber)}
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
                    </TabsContent>

                    <TabsContent value="products" className="mt-0">
                        <Card className="border shadow-sm">
                            <CardContent className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-[60px]">Sr. No.</TableHead>
                                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleProductSort('name')}>
                                                <div className="flex items-center">Product Name {renderSortIcon('name', productSortConfig.field, productSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleProductSort('company')}>
                                                <div className="flex items-center">Company {renderSortIcon('company', productSortConfig.field, productSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead>HSN Code</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleProductSort('mrp')}>
                                                <div className="flex items-center justify-end">MRP {renderSortIcon('mrp', productSortConfig.field, productSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="text-right">PTR</TableHead>
                                            <TableHead className="text-right">PTS</TableHead>
                                            <TableHead className="text-right">NR</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleProductSort('batchesCount')}>
                                                <div className="flex items-center justify-end">Batches {renderSortIcon('batchesCount', productSortConfig.field, productSortConfig.order)}</div>
                                            </TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 8 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16 ml-auto rounded-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : sortedProducts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-20 text-muted-foreground">No products found in master list.</TableCell>
                                            </TableRow>
                                        ) : sortedProducts
                                            .map((p, idx) => {
                                                const bestBatch = p.batches?.length
                                                    ? p.batches.reduce((a, b) => b.currentStock > a.currentStock ? b : a)
                                                    : null;
                                                return (
                                                <TableRow key={p.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="text-slate-500">{idx + 1}</TableCell>
                                                    <TableCell className="font-semibold text-blue-900">{p.name}</TableCell>
                                                    <TableCell className="text-slate-500">{p.company || 'N/A'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{p.hsnCode || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">₹{p.mrp.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono text-slate-700">
                                                        {bestBatch?.ptr ? `₹${bestBatch.ptr.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-slate-700">
                                                        {bestBatch?.pts ? `₹${bestBatch.pts.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-slate-700">
                                                        {bestBatch?.nr ? `₹${bestBatch.nr.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className="font-normal">{p.batches?.length || 0} batches</Badge>
                                                    </TableCell>
                                                    <TableCell className="flex gap-1 justify-end items-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setEditingProduct(p);
                                                                setEditProductDialogOpen(true);
                                                            }}
                                                            title="Edit Product"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        {bestBatch && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                            onClick={() => {
                                                                setEditingBatch({ ...bestBatch, productName: p.name });
                                                                setEditDialogOpen(true);
                                                            }}
                                                            title="Edit Rates (PTR / PTS / NR)"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteProduct(p.id, p.name)}
                                                            title="Delete Product from Master"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <EditStockDialog
                    batch={editingBatch}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onSuccess={fetchStock}
                />

                <EditProductDialog
                    product={editingProduct}
                    open={editProductDialogOpen}
                    onOpenChange={setEditProductDialogOpen}
                    onSuccess={fetchStock}
                />
            </div>
        </RoleGate>
    );
}
