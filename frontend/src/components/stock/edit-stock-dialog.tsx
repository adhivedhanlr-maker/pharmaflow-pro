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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface EditStockDialogProps {
    batch: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditStockDialog({ batch, open, onOpenChange, onSuccess }: EditStockDialogProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const [formData, setFormData] = useState({
        quantity: 0,
        reason: "",
        salePrice: 0,
        purchasePrice: 0,
        mrp: 0,
        ptr: 0,
        pts: 0,
        nr: 0,
    });

    useEffect(() => {
        if (batch) {
            setFormData({
                quantity: batch.currentStock || 0,
                reason: "",
                salePrice: batch.salePrice || 0,
                purchasePrice: batch.purchasePrice || 0,
                mrp: batch.mrp || 0,
                ptr: batch.ptr || 0,
                pts: batch.pts || 0,
                nr: batch.nr || 0,
            });
        }
    }, [batch]);

    const handleNumeric = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: Math.max(0, parseFloat(value) || 0) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!token) {
            alert("Authentication Error: You are not logged in or session expired.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/stock/batches/${batch.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                onSuccess();
                onOpenChange(false);
            } else {
                alert("Failed to update batch");
            }
        } catch (error) {
            console.error(error);
            alert("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    if (!batch) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Edit Batch</DialogTitle>
                    <DialogDescription>
                        Adjust stock and pricing for batch {batch.batchNumber}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Stock</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Current Stock</label>
                                <Input value={batch.currentStock} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">New Quantity *</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.quantity}
                                    onChange={e => handleNumeric("quantity", e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Reason for Adjustment *</label>
                            <Input
                                placeholder="e.g., Damaged goods, Inventory correction"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pricing</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">MRP (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.mrp}
                                    onChange={e => handleNumeric("mrp", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Purchase Price (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.purchasePrice}
                                    onChange={e => handleNumeric("purchasePrice", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Sale Price (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.salePrice}
                                    onChange={e => handleNumeric("salePrice", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">PTR (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.ptr}
                                    onChange={e => handleNumeric("ptr", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">PTS (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.pts}
                                    onChange={e => handleNumeric("pts", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">NR (₹)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.nr}
                                    onChange={e => handleNumeric("nr", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Batch
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
