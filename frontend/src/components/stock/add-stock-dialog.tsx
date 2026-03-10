"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Search, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import { useAuth } from "@/context/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const generateNextBatchNumber = (batches: any[]) => {
    if (!batches || batches.length === 0) {
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
        return `B-${dateStr}-01`;
    }

    let maxSuffix = -1;
    let bestPrefix = "";
    let padding = 0;

    for (const b of batches) {
        const match = b.batchNumber.match(/^(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const numStr = match[2];
            const num = parseInt(numStr, 10);
            if (num > maxSuffix) {
                maxSuffix = num;
                bestPrefix = prefix;
                padding = numStr.length;
            }
        }
    }

    if (maxSuffix !== -1) {
        const nextNumStr = String(maxSuffix + 1).padStart(padding, '0');
        return `${bestPrefix}${nextNumStr}`;
    }

    return `BATCH-${batches.length + 1}`;
};

interface AddStockDialogProps {
    onSuccess: () => void;
}

export function AddStockDialog({ onSuccess }: AddStockDialogProps) {
    const { token } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);

    const [formData, setFormData] = useState({
        batchNumber: "",
        expiryDate: "",
        currentStock: "",
        purchasePrice: "",
        salePrice: "",
        mrp: ""
    });

    // Fetch products for dropdown
    useEffect(() => {
        const fetchProducts = async () => {
            if (!token || !open) return;
            setLoadingProducts(true);
            try {
                const response = await fetch(`${API_BASE}/inventory/products?search=${productSearch}&take=20`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data.data || data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingProducts(false);
            }
        };

        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [productSearch, token, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) {
            setError("Please select a product");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Expiry date from YYYY-MM to ISO
            let isoExpiry = "";
            if (formData.expiryDate) {
                const [year, month] = formData.expiryDate.split('-');
                // Set to last day of the month or just first day
                isoExpiry = new Date(parseInt(year), parseInt(month), 0).toISOString();
            }

            const response = await fetch(`${API_BASE}/inventory/batches`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    batchNumber: formData.batchNumber,
                    expiryDate: isoExpiry,
                    currentStock: parseInt(formData.currentStock),
                    purchasePrice: parseFloat(formData.purchasePrice),
                    salePrice: parseFloat(formData.salePrice),
                    mrp: parseFloat(formData.mrp) || selectedProduct.mrp
                })
            });

            if (response.ok) {
                setOpen(false);
                resetForm();
                onSuccess();
            } else {
                const data = await response.json();
                setError(data.message || "Failed to add stock");
            }
        } catch (err) {
            setError("Failed to connect to server");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            batchNumber: "",
            expiryDate: "",
            currentStock: "",
            purchasePrice: "",
            salePrice: "",
            mrp: ""
        });
        setSelectedProduct(null);
        setError(null);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Add Stock
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Manual Stock</DialogTitle>
                    <DialogDescription>
                        Directly add stock for a product. Use this for initial inventory entry.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Select Product *</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isProductPopoverOpen}
                                            className="w-full justify-between"
                                        >
                                            <span className="truncate">
                                                {selectedProduct ? selectedProduct.name : "Search product..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Type product name..."
                                                value={productSearch}
                                                onValueChange={setProductSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    {loadingProducts ? "Searching..." : "No product found."}
                                                </CommandEmpty>
                                                <CommandGroup className="max-h-60 overflow-y-auto">
                                                    {products.map((product) => (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={product.name}
                                                            onSelect={() => {
                                                                setSelectedProduct(product);
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    mrp: product.mrp.toString(),
                                                                    batchNumber: generateNextBatchNumber(product.batches || [])
                                                                }));
                                                                setIsProductPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{product.name}</span>
                                                                <span className="text-xs text-muted-foreground">{product.company} | MRP: ₹{product.mrp}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <AddProductDialog onProductAdded={() => {
                                // Trigger refresh of products
                                setProductSearch("");
                            }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label htmlFor="batchNumber">Batch Number *</Label>
                            <Input
                                id="batchNumber"
                                name="batchNumber"
                                placeholder="BN12345"
                                value={formData.batchNumber}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label htmlFor="expiryDate">Expiry Date *</Label>
                            <Input
                                id="expiryDate"
                                name="expiryDate"
                                type="month"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currentStock">Qty *</Label>
                            <Input
                                id="currentStock"
                                name="currentStock"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formData.currentStock}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mrp">MRP *</Label>
                            <Input
                                id="mrp"
                                name="mrp"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.mrp}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="purchasePrice">Purchase Price *</Label>
                            <Input
                                id="purchasePrice"
                                name="purchasePrice"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.purchasePrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salePrice">Sale Price *</Label>
                            <Input
                                id="salePrice"
                                name="salePrice"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.salePrice}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={loading || !selectedProduct} className="w-full md:w-auto">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                                </>
                            ) : (
                                "Add Stock Entry"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
