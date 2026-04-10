"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 50;

const ACTION_META: Record<string, { label: string; color: string }> = {
    // Sales
    CREATE_SALE: { label: "Created Invoice", color: "bg-green-100 text-green-800" },
    DELETE_SALE: { label: "Deleted Invoice", color: "bg-red-100 text-red-800" },
    // Purchases
    CREATE_PURCHASE: { label: "Recorded Purchase", color: "bg-blue-100 text-blue-800" },
    UPDATE_PURCHASE: { label: "Updated Purchase", color: "bg-amber-100 text-amber-800" },
    DELETE_PURCHASE: { label: "Deleted Purchase", color: "bg-red-100 text-red-800" },
    // Stock
    UPDATE_INVENTORY: { label: "Adjusted Stock", color: "bg-violet-100 text-violet-800" },
    // Orders
    CREATE_ORDER: { label: "Created Order", color: "bg-cyan-100 text-cyan-800" },
    UPDATE_ORDER_STATUS: { label: "Updated Order Status", color: "bg-amber-100 text-amber-800" },
    CONVERT_ORDER: { label: "Converted Order → Invoice", color: "bg-green-100 text-green-800" },
    // Customers & Suppliers
    CREATE_CUSTOMER: { label: "Added Customer", color: "bg-green-100 text-green-800" },
    UPDATE_CUSTOMER: { label: "Updated Customer", color: "bg-amber-100 text-amber-800" },
    DELETE_CUSTOMER: { label: "Deleted Customer", color: "bg-red-100 text-red-800" },
    CREATE_SUPPLIER: { label: "Added Supplier", color: "bg-green-100 text-green-800" },
    UPDATE_SUPPLIER: { label: "Updated Supplier", color: "bg-amber-100 text-amber-800" },
    DELETE_SUPPLIER: { label: "Deleted Supplier", color: "bg-red-100 text-red-800" },
    // Staff
    CREATE_USER: { label: "Added Staff", color: "bg-green-100 text-green-800" },
    UPDATE_USER: { label: "Updated Staff", color: "bg-amber-100 text-amber-800" },
    DELETE_USER: { label: "Removed Staff", color: "bg-red-100 text-red-800" },
    // Settings & Auth
    UPDATE_BUSINESS_PROFILE: { label: "Changed Settings", color: "bg-slate-100 text-slate-800" },
    LOGIN: { label: "Logged In", color: "bg-slate-100 text-slate-700" },
    LOGOUT: { label: "Logged Out", color: "bg-slate-100 text-slate-700" },
    REGISTER: { label: "Registered", color: "bg-green-100 text-green-800" },
    ENABLE_2FA: { label: "Enabled 2FA", color: "bg-blue-100 text-blue-800" },
    DISABLE_2FA: { label: "Disabled 2FA", color: "bg-amber-100 text-amber-800" },
    SUPPORT_ACCESS_START: { label: "Support Access Started", color: "bg-orange-100 text-orange-800" },
    SUPPORT_ACCESS_END: { label: "Support Access Ended", color: "bg-orange-100 text-orange-800" },
};

const ACTION_OPTIONS = [
    { value: "ALL", label: "All Actions" },
    { value: "CREATE_SALE", label: "Created Invoice" },
    { value: "DELETE_SALE", label: "Deleted Invoice" },
    { value: "CREATE_PURCHASE", label: "Recorded Purchase" },
    { value: "UPDATE_PURCHASE", label: "Updated Purchase" },
    { value: "DELETE_PURCHASE", label: "Deleted Purchase" },
    { value: "UPDATE_INVENTORY", label: "Adjusted Stock" },
    { value: "CREATE_ORDER", label: "Created Order" },
    { value: "UPDATE_ORDER_STATUS", label: "Updated Order Status" },
    { value: "CONVERT_ORDER", label: "Converted Order → Invoice" },
    { value: "CREATE_CUSTOMER", label: "Added Customer" },
    { value: "UPDATE_CUSTOMER", label: "Updated Customer" },
    { value: "DELETE_CUSTOMER", label: "Deleted Customer" },
    { value: "CREATE_SUPPLIER", label: "Added Supplier" },
    { value: "UPDATE_SUPPLIER", label: "Updated Supplier" },
    { value: "DELETE_SUPPLIER", label: "Deleted Supplier" },
    { value: "CREATE_USER", label: "Added Staff" },
    { value: "UPDATE_USER", label: "Updated Staff" },
    { value: "DELETE_USER", label: "Removed Staff" },
    { value: "UPDATE_BUSINESS_PROFILE", label: "Changed Settings" },
    { value: "LOGIN", label: "Logged In" },
];

function parseBrowser(userAgent?: string): string {
    if (!userAgent) return "";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Browser";
}

function formatDetails(action: string, details: any): string {
    if (!details) return "";
    switch (action) {
        case "CREATE_SALE":
            return `${details.invoiceNumber ?? ""} · ₹${Number(details.netAmount ?? 0).toLocaleString("en-IN")}`;
        case "DELETE_SALE":
            return `${details.invoiceNumber ?? ""}`;
        case "CREATE_PURCHASE":
            return `Bill: ${details.billNumber ?? ""} · ₹${Number(details.netAmount ?? 0).toLocaleString("en-IN")}`;
        case "UPDATE_PURCHASE":
            return `Bill: ${details.billNumber ?? ""}`;
        case "DELETE_PURCHASE":
            return `Bill: ${details.billNumber ?? ""}`;
        case "UPDATE_INVENTORY":
            return `${details.productName ?? ""} · Batch ${details.batchNumber ?? ""} · ${details.oldQty} → ${details.newQty}${details.reason ? ` (${details.reason})` : ""}`;
        case "CREATE_ORDER":
            return `${details.customerName ?? ""} · ${details.itemCount ?? 0} item${details.itemCount !== 1 ? "s" : ""}`;
        case "UPDATE_ORDER_STATUS":
            return `${details.customerName ?? ""} → ${details.status ?? ""}`;
        case "CONVERT_ORDER":
            return `${details.invoiceNumber ?? ""} · ${details.customerName ?? ""}`;
        case "CREATE_CUSTOMER":
        case "UPDATE_CUSTOMER":
        case "DELETE_CUSTOMER":
            return `${details.name ?? ""}${details.phone ? ` · ${details.phone}` : ""}`;
        case "CREATE_SUPPLIER":
        case "UPDATE_SUPPLIER":
        case "DELETE_SUPPLIER":
            return `${details.name ?? ""}${details.phone ? ` · ${details.phone}` : ""}`;
        case "CREATE_USER":
        case "DELETE_USER":
            return `${details.name ?? ""} · ${details.role ?? ""}`;
        case "UPDATE_USER":
            return `${details.name ?? ""}${Array.isArray(details.changes) && details.changes.length ? ` · ${details.changes.join(", ")}` : ""}`;
        case "UPDATE_BUSINESS_PROFILE":
            return Array.isArray(details.fields) && details.fields.length ? details.fields.join(", ") : "Settings updated";
        case "LOGIN":
            return parseBrowser(details.userAgent);
        case "REGISTER":
            return `${details.name ?? ""} · ${details.role ?? ""}`;
        default:
            return "";
    }
}

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ActivityLogPage() {
    const { user, token } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [actionFilter, setActionFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const fetchLogs = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(page * PAGE_SIZE),
            });
            if (actionFilter && actionFilter !== "ALL") params.set("action", actionFilter);
            if (startDate) params.set("startDate", startDate);
            if (endDate) {
                // End of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                params.set("endDate", end.toISOString());
            }

            const res = await fetch(`${API}/audit-logs?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error("Failed to load activity log");
            const data = await res.json();
            setLogs(data.logs ?? []);
            setTotal(data.total ?? 0);
        } catch (err: any) {
            if (err.name !== "AbortError") toast.error("Failed to load activity log");
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }, [token, page, actionFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Activity Log</h1>
                    <p className="text-sm text-muted-foreground">Track who does what across the platform</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setPage(0); fetchLogs(); }}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">From</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                        className="w-36 h-9"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">To</label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                        className="w-36 h-9"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">Action</label>
                    <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ACTION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {(startDate || endDate || actionFilter !== "ALL") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 self-end"
                        onClick={() => { setStartDate(""); setEndDate(""); setActionFilter("ALL"); setPage(0); }}
                    >
                        Clear filters
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Time</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">User</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-5 w-28 rounded-full" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No activity found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-slate-100 text-slate-700" };
                                    const details = formatDetails(log.action, log.details);
                                    return (
                                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                                                {formatTime(log.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                {log.user?.name ?? "—"}
                                                {log.user?.role && (
                                                    <div className="text-xs text-muted-foreground font-normal">{log.user.role.replace(/_/g, " ")}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                                                {details}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{total} total entries</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </Button>
                        <span className="px-2">Page {page + 1} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
