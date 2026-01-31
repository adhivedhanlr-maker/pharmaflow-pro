"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Building2, User, MapPin } from "lucide-react";

interface CustomerDialogProps {
    type: "customer" | "supplier";
    onSuccess: (data: any) => void;
    trigger?: React.ReactNode;
}

import { useAuth } from "@/context/auth-context";

export function CustomerDialog({ type, onSuccess, trigger }: CustomerDialogProps) {
    const { token } = useAuth();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Simple form state (in a real app, use react-hook-form + zod)
    const [formData, setFormData] = useState<any>({
        name: "",
        gstin: "",
        phone: "",
        address: "",
        latitude: null,
        longitude: null
    });

    const isCustomer = type === "customer";
    const label = isCustomer ? "Customer" : "Supplier";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!token) {
            alert("Authentication Error: You are not logged in or session expired.");
            setIsLoading(false);
            return;
        }

        try {
            const endpoint = isCustomer ? "customers" : "suppliers";
            const response = await fetch(`${API_BASE}/parties/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const newParty = await response.json();
                onSuccess(newParty);
                setOpen(false);
                setFormData({ name: "", gstin: "", phone: "", address: "", latitude: null, longitude: null });
            } else {
                alert("Failed to create party"); // Replace with toast later
            }
        } catch (error) {
            console.error(error);
            alert("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New {label}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New {label}</DialogTitle>
                    <DialogDescription>
                        Enter the details below. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <div className="relative">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`${label} Name`}
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
                                className="pl-8 uppercase"
                                value={formData.gstin}
                                onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                placeholder="9876543210"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Address</label>
                            <Input
                                placeholder="City"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase text-slate-500">GPS Coordinates</label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] bg-white"
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition((pos) => {
                                            setFormData({
                                                ...formData,
                                                latitude: pos.coords.latitude,
                                                longitude: pos.coords.longitude
                                            });
                                        });
                                    }
                                }}
                            >
                                <MapPin className="h-3 w-3 mr-1" /> Detect My Location
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">Latitude</label>
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0.0000"
                                    className="h-8 text-xs font-mono"
                                    value={formData.latitude || ""}
                                    onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">Longitude</label>
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0.0000"
                                    className="h-8 text-xs font-mono"
                                    value={formData.longitude || ""}
                                    onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save {label}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
