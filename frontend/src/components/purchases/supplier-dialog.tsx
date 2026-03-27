"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, User, Plus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface AddSupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (supplier: any) => void;
}

export function AddSupplierDialog({ open, onOpenChange, onSuccess }: AddSupplierDialogProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const [formData, setFormData] = useState({
        name: "",
        gstin: "",
        phone: "",
        landPhone: "",
        address: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!token) {
            alert("Authentication Error: You are not logged in or session expired.");
            setIsLoading(false);
            return;
        }

        if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
            alert("Invalid GSTIN format. Expected 15 characters (e.g. 27ABCDE1234F1Z5)");
            setIsLoading(false);
            return;
        }

        if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
            alert("Phone number must be exactly 10 digits.");
            setIsLoading(false);
            return;
        }

        if (formData.landPhone && !/^0[0-9]{7,10}$/.test(formData.landPhone)) {
            alert("Landline number must start with 0 and be 8–11 digits (e.g. 04842345678).");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/parties/suppliers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    gstin: formData.gstin,
                    phone: formData.phone,
                    landPhone: formData.landPhone,
                    address: formData.address,
                }),
            });

                if (response.ok) {
                    const newSupplier = await response.json();
                    onSuccess(newSupplier.data || newSupplier);
                    setFormData({
                        name: "",
                        gstin: "",
                        phone: "",
                        landPhone: "",
                        address: ""
                    });
                    onOpenChange(false);
                } else {
                    const err = await response.json().catch(() => ({ message: "Unknown error" }));
                    alert("Failed to create supplier\nDetails: " + JSON.stringify(err, null, 2));
                }
        } catch (error) {
            console.error(error);
            alert("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                    <DialogDescription>
                        Enter supplier details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Supplier Name</label>
                        <div className="relative group">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                placeholder="Supplier Name"
                                className="pl-8"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">GSTIN (Optional)</label>
                        <div className="relative">
                            <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="27XXXXX..."
                                className={cn(
                                    "pl-8 uppercase",
                                    formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin) && "border-red-500 ring-red-100"
                                )}
                                value={formData.gstin}
                                onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                maxLength={15}
                            />
                            {formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin) && (
                                <p className="text-[10px] text-red-500 mt-1 pl-1">Invalid GSTIN format</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mobile</label>
                            <Input
                                placeholder="9876543210"
                                className={cn(
                                    formData.phone && !/^[0-9]{10}$/.test(formData.phone) && "border-red-500"
                                )}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                maxLength={10}
                                required
                            />
                            {formData.phone && formData.phone.length !== 10 && (
                                <p className="text-[10px] text-red-500 mt-1">{formData.phone.length}/10 digits</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Landline <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <Input
                                placeholder="04842345678"
                                className={cn(
                                    formData.landPhone && !/^0[0-9]{7,10}$/.test(formData.landPhone) && "border-red-500"
                                )}
                                value={formData.landPhone}
                                onChange={e => setFormData({ ...formData, landPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                                maxLength={11}
                            />
                            {formData.landPhone && !/^0[0-9]{7,10}$/.test(formData.landPhone) && (
                                <p className="text-[10px] text-red-500 mt-1">Start with 0, 8–11 digits</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">City/Address</label>
                        <Input
                            placeholder="City"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create Supplier
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
