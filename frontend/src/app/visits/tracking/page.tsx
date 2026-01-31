"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User,
    Navigation,
    Clock,
    Loader2,
    RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

// Leaflet CSS needs to be imported globally or in the component
import "leaflet/dist/leaflet.css";

// Dynamic import with no SSR for Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TrackingPage() {
    const { token } = useAuth();
    const [reps, setReps] = useState<any[]>([]);
    const [selectedRep, setSelectedRep] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [leafletReady, setLeafletReady] = useState(false);

    useEffect(() => {
        // Fix Leaflet marker icon issue in Next.js
        const L = require("leaflet");
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setLeafletReady(true);
    }, []);

    useEffect(() => {
        if (token) fetchRepLocations();
        const interval = setInterval(() => {
            if (token) fetchRepLocations();
        }, 30000); // Poll every 30s for free tier
        return () => clearInterval(interval);
    }, [token]);

    const fetchRepLocations = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/visits/active-locations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReps(data);
            }
        } catch (err) {
            console.error("Tracking fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const nileshwarCenter: [number, number] = [12.2557, 75.1341];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Live Tracking (Free Tier)</h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Navigation className="h-4 w-4 text-primary" />
                        Using OpenStreetMap. No API keys required.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRepLocations} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-xs uppercase tracking-wider text-slate-500">Active Field Force</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {reps.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                No active reps currently synced.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {reps.map((rep) => (
                                    <button
                                        key={rep.id}
                                        onClick={() => setSelectedRep(rep)}
                                        className={cn(
                                            "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3",
                                            selectedRep?.id === rep.id && "bg-blue-50 border-l-4 border-blue-600"
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate text-sm">{rep.name}</p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                Sync: {new Date(rep.updatedAt).toLocaleTimeString()}
                                            </p>
                                            <div className="mt-2 flex gap-1">
                                                <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700 border-none px-1.5 h-4">
                                                    LIVE
                                                </Badge>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-slate-200 shadow-sm overflow-hidden h-[600px]">
                    <CardContent className="p-0 relative h-full">
                        {leafletReady && typeof window !== "undefined" ? (
                            <MapContainer
                                center={selectedRep ? [selectedRep.lastLat, selectedRep.lastLng] : nileshwarCenter}
                                zoom={13}
                                scrollWheelZoom={true}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {reps.map((rep) => (
                                    <Marker
                                        key={rep.id}
                                        position={[rep.lastLat, rep.lastLng]}
                                        eventHandlers={{
                                            click: () => setSelectedRep(rep)
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[150px]">
                                                <h3 className="font-bold text-sm mb-1">{rep.name}</h3>
                                                <p className="text-[10px] text-slate-500 mb-2">@{rep.username}</p>
                                                <p className="text-[10px] bg-slate-100 p-1.5 rounded font-mono mb-2">
                                                    {rep.lastLat.toFixed(4)}, {rep.lastLng.toFixed(4)}
                                                </p>
                                                <Button size="sm" className="w-full text-[10px] h-7" variant="outline" onClick={() => window.open(`https://www.google.com/maps?q=${rep.lastLat},${rep.lastLng}`)}>
                                                    Deep View
                                                </Button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-300 mb-2" />
                                <span className="text-xs text-slate-400">Loading Tiles...</span>
                            </div>
                        )}

                        {!loading && reps.length > 0 && (
                            <div className="absolute top-4 right-4 z-[1000] bg-white shadow-lg rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">OSM Active</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
