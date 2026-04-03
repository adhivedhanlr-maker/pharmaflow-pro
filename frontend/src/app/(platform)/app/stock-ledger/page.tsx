"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Batch {
    id: string;
    batchNumber: string;
    expiryDate: string;
    currentStock: number;
    product: { id: string; name: string; company?: string };
    supplier?: { name: string } | null;
}

interface Movement {
    id: string;
    type: "PURCHASE" | "SALE";
    date: string;
    party: string;
    reference: string;
    productName: string;
    productCompany?: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantityIn: number;
    quantityOut: number;
    balance: number;
}

export default function StockLedgerPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [fetched, setFetched] = useState(false);

    const fetchLedger = async (batchId?: string) => {
        setLoading(true);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const params = batchId ? `?batchId=${batchId}` : "";
            const res = await fetch(`${API_BASE}/stock/ledger${params}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error("Failed to fetch ledger");
            const data = await res.json();
            setBatches(data?.batches ?? []);
            setMovements(data?.movements ?? []);
            setFetched(true);
        } catch {
            toast.error("Failed to load stock ledger");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchLedger();
    }, [token]);

    const filteredBatches = useMemo(() => {
        const q = productSearch.toLowerCase();
        return batches.filter(b =>
            b.product.name.toLowerCase().includes(q) ||
            b.batchNumber.toLowerCase().includes(q) ||
            (b.product.company || "").toLowerCase().includes(q)
        );
    }, [batches, productSearch]);

    const displayedMovements = useMemo(() => {
        if (!selectedBatchId) return movements;
        return movements.filter(m => m.batchId === selectedBatchId);
    }, [movements, selectedBatchId]);

    const selectedBatch = batches.find(b => b.id === selectedBatchId);

    const totalsIn = displayedMovements.reduce((s, m) => s + m.quantityIn, 0);
    const totalsOut = displayedMovements.reduce((s, m) => s + m.quantityOut, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Stock Ledger</h1>
                <p className="text-muted-foreground">Track every movement — purchases in, sales out — per product batch.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left: Batch selector */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Select Batch</CardTitle>
                        <div className="relative mt-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search product or batch..."
                                className="pl-8 h-8 text-sm"
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading && !fetched ? (
                            <div className="p-3 space-y-2">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : filteredBatches.length === 0 ? (
                            <p className="text-xs text-slate-400 p-4 text-center">No batches found</p>
                        ) : (
                            <div className="divide-y max-h-[500px] overflow-y-auto">
                                <button
                                    onClick={() => setSelectedBatchId(null)}
                                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors ${!selectedBatchId ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
                                >
                                    <div className="font-semibold text-slate-700">All Batches</div>
                                    <div className="text-slate-400">{batches.length} batches total</div>
                                </button>
                                {filteredBatches.map(batch => (
                                    <button
                                        key={batch.id}
                                        onClick={() => setSelectedBatchId(batch.id)}
                                        className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors ${selectedBatchId === batch.id ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
                                    >
                                        <div className="font-semibold text-slate-800 truncate">{batch.product.name}</div>
                                        <div className="text-slate-500">{batch.batchNumber} · Qty: {batch.currentStock}</div>
                                        {batch.product.company && <div className="text-slate-400 truncate">{batch.product.company}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Movement table */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Summary cards */}
                    {fetched && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs text-slate-500 mb-1">Total In (Purchases)</div>
                                    <div className="text-xl font-bold text-green-600">+{totalsIn}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs text-slate-500 mb-1">Total Out (Sales)</div>
                                    <div className="text-xl font-bold text-red-500">-{totalsOut}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs text-slate-500 mb-1">Current Stock</div>
                                    <div className="text-xl font-bold text-slate-800">
                                        {selectedBatch
                                            ? selectedBatch.currentStock
                                            : batches.reduce((s, b) => s + b.currentStock, 0)
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base">
                                    {selectedBatch
                                        ? `${selectedBatch.product.name} · ${selectedBatch.batchNumber}`
                                        : "All Movements"}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {displayedMovements.length} transaction{displayedMovements.length !== 1 ? "s" : ""}
                                </CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => fetchLedger(selectedBatchId ?? undefined)} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-4 space-y-2">
                                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                                </div>
                            ) : displayedMovements.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-sm">
                                    {fetched ? "No movements found for this batch." : "Select a batch to view movements."}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="text-xs">Date</TableHead>
                                                <TableHead className="text-xs">Type</TableHead>
                                                <TableHead className="text-xs">Product / Batch</TableHead>
                                                <TableHead className="text-xs">Party</TableHead>
                                                <TableHead className="text-xs">Reference</TableHead>
                                                <TableHead className="text-xs text-green-600">In</TableHead>
                                                <TableHead className="text-xs text-red-500">Out</TableHead>
                                                <TableHead className="text-xs text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayedMovements.map((m) => (
                                                <TableRow key={m.id} className="text-sm">
                                                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                        {format(new Date(m.date), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        {m.type === "PURCHASE" ? (
                                                            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 gap-1 text-[10px]">
                                                                <ArrowDownCircle className="h-3 w-3" /> Purchase
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1 text-[10px]">
                                                                <ArrowUpCircle className="h-3 w-3" /> Sale
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-xs">{m.productName}</div>
                                                        <div className="text-[10px] text-slate-400">{m.batchNumber} · Exp: {format(new Date(m.expiryDate), "MM/yy")}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs max-w-[140px] truncate">{m.party}</TableCell>
                                                    <TableCell className="text-xs font-mono text-slate-500">{m.reference}</TableCell>
                                                    <TableCell className="text-green-600 font-semibold text-sm">
                                                        {m.quantityIn > 0 ? `+${m.quantityIn}` : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-red-500 font-semibold text-sm">
                                                        {m.quantityOut > 0 ? `-${m.quantityOut}` : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-sm">
                                                        {m.balance}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
