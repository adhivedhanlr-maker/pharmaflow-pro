"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

interface RateCardEntry {
    id: string;
    productId: string;
    mrp: number;
    ptr: number;
    pts: number;
    nr: number;
    discountPct: number;
    product: {
        id: string;
        name: string;
        composition?: string;
        packing?: string;
    };
}

interface Product {
    id: string;
    name: string;
    composition?: string;
    packing?: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplierId: string;
    supplierName: string;
}

const EMPTY_RATES = { mrp: "", ptr: "", pts: "", nr: "", discountPct: "" };

export function SupplierRateCardDialog({ open, onOpenChange, supplierId, supplierName }: Props) {
    const { token } = useAuth();
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const [entries, setEntries] = useState<RateCardEntry[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // productId being saved
    const [deleting, setDeleting] = useState<string | null>(null);

    // Add-new-row state
    const [showAddRow, setShowAddRow] = useState(false);
    const [newProductId, setNewProductId] = useState("");
    const [newRates, setNewRates] = useState(EMPTY_RATES);

    // Edit-row state
    const [editingId, setEditingId] = useState<string | null>(null); // entry.id
    const [editRates, setEditRates] = useState(EMPTY_RATES);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = useCallback(async () => {
        if (!open || !supplierId) return;
        setLoading(true);
        try {
            const [rcRes, prodRes] = await Promise.all([
                fetch(`${API}/parties/suppliers/${supplierId}/rate-card`, { headers }),
                fetch(`${API}/inventory/products?includeBatches=false`, { headers }),
            ]);
            if (rcRes.ok) setEntries(await rcRes.json());
            if (prodRes.ok) {
                const data = await prodRes.json();
                setProducts(Array.isArray(data) ? data : data.data ?? []);
            }
        } catch {
            toast.error("Failed to load rate card");
        } finally {
            setLoading(false);
        }
    }, [open, supplierId]);

    useEffect(() => {
        fetchData();
        setShowAddRow(false);
        setEditingId(null);
        setNewProductId("");
        setNewRates(EMPTY_RATES);
    }, [fetchData]);

    const availableProducts = products.filter(
        p => !entries.some(e => e.productId === p.id)
    );

    const handleAdd = async () => {
        if (!newProductId) { toast.error("Please select a product"); return; }
        setSaving("new");
        try {
            const res = await fetch(`${API}/parties/suppliers/${supplierId}/rate-card`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: newProductId,
                    mrp: parseFloat(newRates.mrp) || 0,
                    ptr: parseFloat(newRates.ptr) || 0,
                    pts: parseFloat(newRates.pts) || 0,
                    nr: parseFloat(newRates.nr) || 0,
                    discountPct: parseFloat(newRates.discountPct) || 0,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Product added to rate card");
            setShowAddRow(false);
            setNewProductId("");
            setNewRates(EMPTY_RATES);
            fetchData();
        } catch {
            toast.error("Failed to add product");
        } finally {
            setSaving(null);
        }
    };

    const handleEdit = (entry: RateCardEntry) => {
        setEditingId(entry.id);
        setEditRates({
            mrp: String(entry.mrp),
            ptr: String(entry.ptr),
            pts: String(entry.pts),
            nr: String(entry.nr),
            discountPct: String(entry.discountPct),
        });
    };

    const handleSaveEdit = async (entry: RateCardEntry) => {
        setSaving(entry.id);
        try {
            const res = await fetch(`${API}/parties/suppliers/${supplierId}/rate-card`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: entry.productId,
                    mrp: parseFloat(editRates.mrp) || 0,
                    ptr: parseFloat(editRates.ptr) || 0,
                    pts: parseFloat(editRates.pts) || 0,
                    nr: parseFloat(editRates.nr) || 0,
                    discountPct: parseFloat(editRates.discountPct) || 0,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Rate card updated");
            setEditingId(null);
            fetchData();
        } catch {
            toast.error("Failed to update rate card");
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (entry: RateCardEntry) => {
        if (!confirm(`Remove ${entry.product.name} from this rate card?`)) return;
        setDeleting(entry.id);
        try {
            const res = await fetch(`${API}/parties/suppliers/${supplierId}/rate-card/${entry.productId}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error();
            toast.success("Removed from rate card");
            fetchData();
        } catch {
            toast.error("Failed to remove entry");
        } finally {
            setDeleting(null);
        }
    };

    const numInput = (val: string, onChange: (v: string) => void) => (
        <Input
            type="number"
            min="0"
            step="0.01"
            className="h-7 w-20 text-[11px] text-right font-mono"
            value={val}
            onChange={e => onChange(e.target.value)}
        />
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-base">{supplierName} — Rate Card</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                                <th className="px-3 py-2 text-left font-semibold">Product</th>
                                <th className="px-2 py-2 text-right font-semibold w-20">MRP</th>
                                <th className="px-2 py-2 text-right font-semibold w-20">PTR</th>
                                <th className="px-2 py-2 text-right font-semibold w-20">PTS</th>
                                <th className="px-2 py-2 text-right font-semibold w-20">NR</th>
                                <th className="px-2 py-2 text-right font-semibold w-16">Disc%</th>
                                <th className="px-2 py-2 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2"><Skeleton className="h-4 w-40" /></td>
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="px-2 py-2"><Skeleton className="h-4 w-16 ml-auto" /></td>
                                        ))}
                                        <td />
                                    </tr>
                                ))
                            ) : entries.length === 0 && !showAddRow ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-400">
                                        No products in rate card yet. Click "+ Add Product" to start.
                                    </td>
                                </tr>
                            ) : (
                                entries.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-slate-800">{entry.product.name}</div>
                                            {entry.product.composition && (
                                                <div className="text-[10px] text-slate-400">{entry.product.composition}</div>
                                            )}
                                        </td>
                                        {editingId === entry.id ? (
                                            <>
                                                <td className="px-1 py-1 text-right">{numInput(editRates.mrp, v => setEditRates(r => ({ ...r, mrp: v })))}</td>
                                                <td className="px-1 py-1 text-right">{numInput(editRates.ptr, v => setEditRates(r => ({ ...r, ptr: v })))}</td>
                                                <td className="px-1 py-1 text-right">{numInput(editRates.pts, v => setEditRates(r => ({ ...r, pts: v })))}</td>
                                                <td className="px-1 py-1 text-right">{numInput(editRates.nr, v => setEditRates(r => ({ ...r, nr: v })))}</td>
                                                <td className="px-1 py-1 text-right">{numInput(editRates.discountPct, v => setEditRates(r => ({ ...r, discountPct: v })))}</td>
                                                <td className="px-1 py-1">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" disabled={saving === entry.id} onClick={() => handleSaveEdit(entry)}>
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => setEditingId(null)}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-2 py-2 text-right font-mono">{entry.mrp.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-mono">{entry.ptr.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-mono">{entry.pts.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-mono text-orange-600 font-semibold">{entry.nr.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-mono">{entry.discountPct.toFixed(1)}%</td>
                                                <td className="px-2 py-2">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => handleEdit(entry)}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" disabled={deleting === entry.id} onClick={() => handleDelete(entry)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}

                            {/* Add new row */}
                            {showAddRow && (
                                <tr className="bg-green-50/40">
                                    <td className="px-2 py-1">
                                        <select
                                            className="h-7 w-full text-[11px] border border-slate-200 rounded px-1.5 bg-white outline-none focus:ring-1 focus:ring-primary"
                                            value={newProductId}
                                            onChange={e => setNewProductId(e.target.value)}
                                        >
                                            <option value="">Select product...</option>
                                            {availableProducts.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1 text-right">{numInput(newRates.mrp, v => setNewRates(r => ({ ...r, mrp: v })))}</td>
                                    <td className="px-1 py-1 text-right">{numInput(newRates.ptr, v => setNewRates(r => ({ ...r, ptr: v })))}</td>
                                    <td className="px-1 py-1 text-right">{numInput(newRates.pts, v => setNewRates(r => ({ ...r, pts: v })))}</td>
                                    <td className="px-1 py-1 text-right">{numInput(newRates.nr, v => setNewRates(r => ({ ...r, nr: v })))}</td>
                                    <td className="px-1 py-1 text-right">{numInput(newRates.discountPct, v => setNewRates(r => ({ ...r, discountPct: v })))}</td>
                                    <td className="px-1 py-1">
                                        <div className="flex gap-1 justify-end">
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" disabled={saving === "new"} onClick={handleAdd}>
                                                <Check className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => { setShowAddRow(false); setNewProductId(""); setNewRates(EMPTY_RATES); }}>
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => { setShowAddRow(true); setEditingId(null); }}
                        disabled={showAddRow || availableProducts.length === 0}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
