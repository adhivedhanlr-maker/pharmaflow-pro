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
        reason: ""
    });

    useEffect(() => {
        if (batch) {
            setFormData({
                quantity: batch.currentStock || 0,
                reason: ""
            });
        }
    }, [batch]);

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
                alert("Failed to update stock");
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Stock</DialogTitle>
                    <DialogDescription>
                        Manually adjust stock quantity for batch {batch.batchNumber}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Current Stock</label>
                        <Input
                            value={batch.currentStock}
                            disabled
                            className="bg-muted"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Quantity</label>
                        <Input
                            type="number"
                            placeholder="Enter new quantity"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for Adjustment</label>
                        <Input
                            placeholder="e.g., Damaged goods, Inventory correction"
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Stock
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
