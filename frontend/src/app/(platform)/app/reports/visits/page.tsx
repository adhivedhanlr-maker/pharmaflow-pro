"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    MapPin,
    Calendar,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    Search,
    RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Visit {
    id: string;
    repId: string;
    rep: { name: string };
    customerId: string;
    customer: { name: string; address: string };
    checkInTime: string;
    latitude: number;
    longitude: number;
    distance: number;
    status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function VisitsReportPage() {
    const { token } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (token) {
            fetchVisits();
        }
    }, [token]);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/visits/report`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setVisits(data);
            }
        } catch (error) {
            console.error("Failed to fetch visit reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVisits = visits.filter(v =>
        v.rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <RoleGate allowedRoles={["ADMIN", "ACCOUNTANT"]}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Field Activity Tracker</h1>
                        <p className="text-muted-foreground">Monitor sales representatives' physical visits and shop check-ins.</p>
                    </div>
                    <Button onClick={fetchVisits} variant="outline" size="sm">
                        <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                        Refresh Data
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by rep or pharmacy name..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Visits</CardTitle>
                        <CardDescription>Live feed of sales team check-ins with GPS verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sales Rep</TableHead>
                                    <TableHead>Pharmacy / Location</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>GPS Accuracy</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && visits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading flight logs...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredVisits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            No visit logs found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredVisits.map((visit) => (
                                    <TableRow key={visit.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <span className="font-medium">{visit.rep.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-primary">{visit.customer.name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {visit.customer.address || "No address on record"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{format(new Date(visit.checkInTime), 'hh:mm aa')}</span>
                                                <span className="text-xs text-muted-foreground">{format(new Date(visit.checkInTime), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-mono">{visit.distance.toFixed(0)}m from shop</span>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all",
                                                            visit.distance < 100 ? "bg-green-500" :
                                                                visit.distance < 500 ? "bg-yellow-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, (visit.distance / 500) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {visit.status === "VERIFIED" ? (
                                                <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                    Mismatch
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </RoleGate>
    );
}
