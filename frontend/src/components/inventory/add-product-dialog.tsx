"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AddProductDialogProps {
    onProductAdded: () => void;
}

export function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        hsnCode: "",
        company: "",
        mrp: "",
        gstRate: "12", // Default popular tax rate
        reorderLevel: "10"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE}/inventory/products`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    hsnCode: formData.hsnCode,
                    company: formData.company,
                    mrp: parseFloat(formData.mrp),
                    gstRate: parseFloat(formData.gstRate),
                    reorderLevel: parseInt(formData.reorderLevel)
                })
            });

            if (response.ok) {
                setOpen(false);
                setFormData({
                    name: "",
                    hsnCode: "",
                    company: "",
                    mrp: "",
                    gstRate: "12",
                    reorderLevel: "10"
                });
                onProductAdded();
            } else {
                const data = await response.json();
                setError(data.message || "Failed to create product");
            }
        } catch (err) {
            setError("Failed to connect to server");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> New Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Create a new product in the master inventory list.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. Dolo 650mg"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hsnCode">HSN Code</Label>
                            <Input
                                id="hsnCode"
                                name="hsnCode"
                                placeholder="3004"
                                value={formData.hsnCode}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input
                                id="company"
                                name="company"
                                placeholder="e.g. Micro Labs"
                                value={formData.company}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mrp">MRP *</Label>
                            <Input
                                id="mrp"
                                name="mrp"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.mrp}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gstRate">GST Rate (%)</Label>
                            <select
                                id="gstRate"
                                name="gstRate"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.gstRate}
                                onChange={handleChange}
                            >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reorderLevel">Reorder Level</Label>
                            <Input
                                id="reorderLevel"
                                name="reorderLevel"
                                type="number"
                                min="1"
                                value={formData.reorderLevel}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                                </>
                            ) : (
                                "Create Product"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
