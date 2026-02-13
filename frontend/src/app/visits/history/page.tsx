"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Map as MapIcon, Calendar, Clock, Navigation } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";

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

interface LocationLog {
    id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface Rep {
    id: string;
    name: string;
    lastLat?: number;
    lastLng?: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function RouteHistoryPage() {
    const { token, user } = useAuth();
    const [leafletReady, setLeafletReady] = useState(false);
    const [loading, setLoading] = useState(false);

    // State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedRepId, setSelectedRepId] = useState<string>("");
    const [reps, setReps] = useState<Rep[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [routePath, setRoutePath] = useState<LocationLog[]>([]);

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
            fetchData();
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [visitsRes, pathRes] = await Promise.all([
                fetch(`${API_BASE}/visits/route?repId=${selectedRepId}&date=${selectedDate}`, { headers }),
                fetch(`${API_BASE}/visits/route-path?repId=${selectedRepId}&date=${selectedDate}`, { headers })
            ]);

            if (visitsRes.ok) setVisits(await visitsRes.json());
            if (pathRes.ok) setRoutePath(await pathRes.json());

        } catch (error) {
            console.error("Failed to fetch route data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Statistics
    const stats = useMemo(() => {
        if (routePath.length < 2) return { distance: 0, duration: 0, startTime: null, endTime: null };

        let totalDist = 0;
        for (let i = 1; i < routePath.length; i++) {
            totalDist += calculateDistance(
                routePath[i - 1].latitude, routePath[i - 1].longitude,
                routePath[i].latitude, routePath[i].longitude
            );
        }

        const startTime = new Date(routePath[0].timestamp);
        const endTime = new Date(routePath[routePath.length - 1].timestamp);
        const duration = differenceInMinutes(endTime, startTime);

        return { distance: totalDist.toFixed(2), duration, startTime, endTime };
    }, [routePath]);

    const polylinePositions = routePath.map(log => [log.latitude, log.longitude]);

    // Fallback center
    const selectedRepData = user?.role === 'ADMIN' ? reps.find(r => r.id === selectedRepId) : user;

    const center: [number, number] = routePath.length > 0
        ? [routePath[0].latitude, routePath[0].longitude]
        : visits.length > 0
            ? [visits[0].latitude, visits[0].longitude]
            : (selectedRepData?.lastLat && selectedRepData?.lastLng)
                ? [selectedRepData.lastLat, selectedRepData.lastLng]
                : [12.9716, 77.5946];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Route History</h1>
                    <p className="text-muted-foreground">Visualize actual daily travel paths.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {user?.role === 'ADMIN' && (
                        <div className="w-full sm:w-[200px]">
                            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Rep" />
                                </SelectTrigger>
                                <SelectContent className="z-[1200]">
                                    {reps.map(rep => (
                                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                                    ))}
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
                    <Button onClick={fetchData} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Route"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Navigation className="h-4 w-4" /> Total Distance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{stats.distance} km</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Duration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">
                            {Math.floor(stats.duration / 60)}h {stats.duration % 60}m
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MapIcon className="h-4 w-4" /> Visits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{visits.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Start Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">
                            {stats.startTime ? format(stats.startTime, 'hh:mm a') : '--:--'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="h-[500px] flex flex-col overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0 flex-1 relative">
                    {leafletReady && typeof window !== 'undefined' ? (
                        <MapContainer
                            center={center}
                            zoom={13}
                            scrollWheelZoom={true}
                            style={{ height: "100%", width: "100%" }}
                            key={`${selectedRepId}-${selectedDate}`}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Actual Route Path */}
                            {routePath.length > 0 && (
                                <Polyline
                                    positions={polylinePositions as any}
                                    pathOptions={{ color: 'blue', weight: 4, opacity: 0.8 }}
                                />
                            )}

                            {/* Check-in Markers */}
                            {visits.map((visit, index) => (
                                <Marker
                                    key={visit.id}
                                    position={[visit.latitude, visit.longitude]}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <p className="font-bold">{index + 1}. {visit.customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{visit.customer.address}</p>
                                            <div className="mt-1 pt-1 border-t flex items-center gap-1 text-xs font-semibold">
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

                    {!loading && routePath.length === 0 && visits.length === 0 && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-6 py-4 rounded-lg shadow-lg text-center z-[1000] border">
                            <MapIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-600">No route data available</p>
                            <p className="text-xs text-slate-400">Try selecting a different date.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
