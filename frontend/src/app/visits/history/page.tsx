"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Map as MapIcon, Calendar, User } from "lucide-react";
import { format } from "date-fns";

// Leaflet CSS needs to be imported globally or in the component
import "leaflet/dist/leaflet.css";

// Dynamic import with no SSR for Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Visit {
    id: string;
    latitude: number;
    longitude: number;
    checkInTime: string;
    customer: {
        name: string;
        address: string;
    };
}

interface Rep {
    id: string;
    name: string;
}

export default function RouteHistoryPage() {
    const { token, user } = useAuth();
    const [leafletReady, setLeafletReady] = useState(false);
    const [loading, setLoading] = useState(false);

    // State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedRepId, setSelectedRepId] = useState<string>("");
    const [reps, setReps] = useState<Rep[]>([]);
    const [route, setRoute] = useState<Visit[]>([]);

    useEffect(() => {
        // Fix Leaflet marker icon issue in Next.js
        if (typeof window !== 'undefined') {
            import("leaflet").then((L) => {
                // @ts-ignore
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                });
                setLeafletReady(true);
            });
        }
    }, []);

    useEffect(() => {
        if (token && user?.role === 'ADMIN') {
            fetchReps();
        } else if (user) {
            setSelectedRepId(user.id);
        }
    }, [token, user]);

    useEffect(() => {
        if (token && selectedRepId && selectedDate) {
            fetchRoute();
        }
    }, [token, selectedRepId, selectedDate]);

    const fetchReps = async () => {
        try {
            const response = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const salesReps = data.filter((u: any) => u.role === 'SALES_REP');
                setReps(salesReps);
                if (salesReps.length > 0 && !selectedRepId) {
                    setSelectedRepId(salesReps[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch reps:", error);
        }
    };

    const fetchRoute = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/visits/route?repId=${selectedRepId}&date=${selectedDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRoute(data);
            }
        } catch (error) {
            console.error("Failed to fetch route:", error);
        } finally {
            setLoading(false);
        }
    };

    const polylinePositions = route.map(visit => [visit.latitude, visit.longitude]);
    const center: [number, number] = route.length > 0
        ? [route[0].latitude, route[0].longitude]
        : [12.9716, 77.5946]; // Default to Bangalore or user's location

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Route History</h1>
                    <p className="text-muted-foreground">Visualize daily travel paths for sales representatives.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {user?.role === 'ADMIN' && (
                        <div className="w-full sm:w-[200px]">
                            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Rep" />
                                </SelectTrigger>
                                <SelectContent className="z-[1200]">
                                    {reps.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">Loading or No Reps...</div>
                                    ) : (
                                        reps.map(rep => (
                                            <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="w-full sm:w-[180px]">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <Button onClick={fetchRoute} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Route"}
                    </Button>
                </div>
            </div>

            <Card className="h-[600px] flex flex-col overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0 flex-1 relative">
                    {leafletReady && typeof window !== 'undefined' ? (
                        <MapContainer
                            center={center}
                            zoom={13}
                            scrollWheelZoom={true}
                            style={{ height: "100%", width: "100%" }}
                            key={`${selectedRepId}-${selectedDate}`} // Force re-render on change
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {route.length > 0 && (
                                <Polyline
                                    positions={polylinePositions as any}
                                    pathOptions={{ color: 'blue', weight: 4, opacity: 0.7 }}
                                />
                            )}

                            {route.map((visit, index) => (
                                <Marker
                                    key={visit.id}
                                    position={[visit.latitude, visit.longitude]}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <p className="font-bold">{index + 1}. {visit.customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{visit.customer.address}</p>
                                            <div className="mt-1 pt-1 border-t flex items-center gap-1 text-xs">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(visit.checkInTime), 'hh:mm a')}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        </div>
                    )}

                    {!loading && route.length === 0 && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-6 py-4 rounded-lg shadow-lg text-center z-[1000] border">
                            <MapIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-600">No visits recorded</p>
                            <p className="text-xs text-slate-400">Try selecting a different date or representative.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{route.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Start Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {route.length > 0 ? format(new Date(route[0].checkInTime), 'hh:mm a') : '--:--'}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">End Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {route.length > 0 ? format(new Date(route[route.length - 1].checkInTime), 'hh:mm a') : '--:--'}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
