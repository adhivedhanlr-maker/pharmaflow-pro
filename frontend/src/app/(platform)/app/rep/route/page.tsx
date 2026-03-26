"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, CheckCircle, Navigation, Clock } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RouteStop {
    id: string;
    stopOrder: number;
    status: "PENDING" | "COMPLETED" | "SKIPPED";
    customer: {
        id: string;
        name: string;
        address: string;
        city: string;
    };
}

interface Route {
    id: string;
    date: string;
    status: string;
    stops: RouteStop[];
}

export default function MyRoutePage() {
    const { token, user } = useAuth();
    // const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [route, setRoute] = useState<Route | null>(null);

    useEffect(() => {
        if (token) fetchTodayRoute();
    }, [token]);

    const fetchTodayRoute = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            const res = await fetch(`${API_BASE}/routes?date=${today}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setRoute(data[0]); // Assuming one route per day
                } else {
                    setRoute(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch route", error);
        } finally {
            setLoading(false);
        }
    };

    const markStopStatus = async (stopId: string, status: "COMPLETED" | "SKIPPED") => {
        if (!route) return;
        try {
            const res = await fetch(`${API_BASE}/routes/${route.id}/stops/${stopId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                alert(`Success: Stop marked as ${status.toLowerCase()}`);
                fetchTodayRoute(); // Refresh
            } else {
                alert("Error: Failed to update stop");
            }
        } catch (error) {
            alert("Error: Network error");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <RoleGate allowedRoles={["STAFF", "REP", "ADMIN"]}>
            <div className="space-y-4 max-w-md mx-auto pb-20">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Today's Route</h1>
                    <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                </div>

                {!route ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <MapPin className="h-10 w-10 mb-2 opacity-20" />
                            <p>No route assigned for today.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {route.stops.map((stop, index) => {
                            const isCompleted = stop.status === "COMPLETED";
                            const isSkipped = stop.status === "SKIPPED";

                            return (
                                <Card key={stop.id} className={`relative overflow-hidden transition-all ${isCompleted ? 'opacity-70 bg-slate-50' : 'border-primary/20 shadow-sm'}`}>
                                    {/* Connector Line */}
                                    {index !== route.stops.length - 1 && (
                                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-200 -z-10" />
                                    )}

                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/0" />

                                    <CardContent className="p-4 flex gap-4">
                                        <div className="flex-none flex flex-col items-center gap-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 
                                                ${isCompleted ? 'bg-green-100 border-green-500 text-green-700' :
                                                    isSkipped ? 'bg-slate-100 border-slate-300 text-slate-500' :
                                                        'bg-primary text-primary-foreground border-primary'}`}>
                                                {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`font-semibold ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                                                        {stop.customer.name}
                                                    </h3>
                                                    {isSkipped && <Badge variant="outline">Skipped</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{stop.customer.address}, {stop.customer.city}</p>
                                            </div>

                                            {!isCompleted && !isSkipped && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button size="sm" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => markStopStatus(stop.id, "COMPLETED")}>
                                                        <MapPin className="h-4 w-4" /> Check In
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-none px-3" onClick={() => markStopStatus(stop.id, "SKIPPED")}>
                                                        Skip
                                                    </Button>
                                                </div>
                                            )}

                                            {isCompleted && (
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" /> Visit Completed
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}

                        <div className="text-center p-4">
                            <p className="text-xs text-muted-foreground">End of Route</p>
                        </div>
                    </div>
                )}
            </div>
        </RoleGate>
    );
}
