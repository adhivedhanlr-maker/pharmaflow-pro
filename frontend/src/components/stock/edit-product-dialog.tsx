"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

interface EditProductDialogProps {
    product: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditProductDialog({ product, open, onOpenChange, onSuccess }: EditProductDialogProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const [formData, setFormData] = useState({
        name: "",
        company: "",
        hsnCode: "",
        mrp: 0,
        gstRate: 0,
        composition: "",
        packing: "",
        reorderLevel: 10,
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                company: product.company || "",
                hsnCode: product.hsnCode || "",
                mrp: product.mrp || 0,
                gstRate: product.gstRate || 0,
                composition: product.composition || "",
                packing: product.packing || "",
                reorderLevel: product.reorderLevel ?? 10,
            });
        }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericFields = ["mrp", "gstRate", "reorderLevel"];
        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? Math.max(0, parseFloat(value) || 0) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!token) {
            toast.error("Authentication Error: You are not logged in or session expired.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/inventory/products/${product.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update product");
            }

            toast.success("Product updated successfully");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error(error.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Edit Product Master</DialogTitle>
                    <DialogDescription>
                        Update the master details for {product?.name}. This will not affect existing batches directly, but will change the product information.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter product name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input
                                id="company"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="Enter company name"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hsnCode">HSN Code</Label>
                                <Input
                                    id="hsnCode"
                                    name="hsnCode"
                                    value={formData.hsnCode}
                                    onChange={handleChange}
                                    placeholder="HSN Code"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mrp">MRP (₹) *</Label>
                                <Input
                                    id="mrp"
                                    name="mrp"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstRate">GST Rate (%)</Label>
                                <Input
                                    id="gstRate"
                                    name="gstRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.gstRate}
                                    onChange={handleChange}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="composition">Composition</Label>
                            <Input
                                id="composition"
                                name="composition"
                                value={formData.composition}
                                onChange={handleChange}
                                placeholder="e.g., Paracetamol 500mg"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="packing">Packing</Label>
                                <Input
                                    id="packing"
                                    name="packing"
                                    value={formData.packing}
                                    onChange={handleChange}
                                    placeholder="e.g., 10x10 Tablets"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reorderLevel">Reorder Level</Label>
                                <Input
                                    id="reorderLevel"
                                    name="reorderLevel"
                                    type="number"
                                    min="0"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                    placeholder="10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Product
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
