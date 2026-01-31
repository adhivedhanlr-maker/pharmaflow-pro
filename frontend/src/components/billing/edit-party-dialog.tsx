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
import { Loader2, Building2, User, MapPin, Search, Map as MapIcon } from "lucide-react";

interface EditPartyDialogProps {
    type: "customer" | "supplier";
    party: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

import { useAuth } from "@/context/auth-context";

export function EditPartyDialog({ type, party, open, onOpenChange, onSuccess }: EditPartyDialogProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const [formData, setFormData] = useState<any>({
        name: "",
        gstin: "",
        phone: "",
        address: "",
        latitude: null,
        longitude: null
    });

    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleNominatimSearch = async (query: string) => {
        setFormData({ ...formData, name: query });
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error("Nominatim error:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const selectPharmacy = (place: any) => {
        setFormData({
            ...formData,
            name: place.display_name.split(',')[0],
            address: place.display_name,
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon)
        });
        setSearchResults([]);
    };

    // Update form when party changes
    useEffect(() => {
        if (party) {
            setFormData({
                name: party.name || "",
                gstin: party.gstin || "",
                phone: party.phone || "",
                address: party.address || "",
                latitude: party.latitude || null,
                longitude: party.longitude || null
            });
        }
    }, [party]);

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
            const response = await fetch(`${API_BASE}/parties/${endpoint}/${party.id}`, {
                method: "PUT",
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
                alert("Failed to update party");
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
                    <DialogTitle>Edit {label}</DialogTitle>
                    <DialogDescription>
                        Update the details below. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <div className="relative group">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                placeholder={`${label} Name`}
                                className="pl-8"
                                value={formData.name}
                                onChange={e => handleNominatimSearch(e.target.value)}
                                required
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-300" />
                            )}

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map((res: any, idx: number) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="w-full text-left p-3 hover:bg-slate-50 border-b last:border-0"
                                            onClick={() => selectPharmacy(res)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <MapIcon className="h-3 w-3 text-blue-500" />
                                                <div>
                                                    <p className="text-xs font-bold">{res.display_name.split(',')[0]}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{res.display_name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
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
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
