"use client";

import { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User,
    Navigation,
    Clock,
    Map as MapIcon,
    AlertCircle,
    Loader2,
    RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const containerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '12px'
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TrackingPage() {
    const { token } = useAuth();
    const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "");
    const [reps, setReps] = useState<any[]>([]);
    const [selectedRep, setSelectedRep] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    });

    useEffect(() => {
        if (token) fetchRepLocations();
        const interval = setInterval(() => {
            if (token) fetchRepLocations();
        }, 15000); // Poll every 15s
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

    const nileshwarCenter = {
        lat: 12.2557,
        lng: 75.1341
    };

    if (!apiKey && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <h1 className="text-xl font-bold">Google Maps API Key Required</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    To see your sales reps on a map, please enter your Google Maps API key below.
                    You can get one from the Google Cloud Console.
                </p>
                <div className="flex w-full max-w-sm gap-2">
                    <Input
                        placeholder="Enter API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button onClick={() => window.location.reload()}>Apply</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Live Rep Tracking</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        Real-time positions of field staff. Updated every 15s.
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
                        <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Active Reps</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {reps.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-20" />
                                No active reps tracked yet.
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
                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{rep.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Last sync: {new Date(rep.updatedAt).toLocaleTimeString()}
                                            </p>
                                            <div className="mt-2 flex gap-1">
                                                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                                                    Active
                                                </Badge>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-0 relative">
                        {isLoaded ? (
                            <GoogleMap
                                mapContainerStyle={containerStyle}
                                center={selectedRep ? { lat: selectedRep.lastLat, lng: selectedRep.lastLng } : nileshwarCenter}
                                zoom={selectedRep ? 16 : 13}
                                options={{
                                    styles: [
                                        {
                                            featureType: "all",
                                            elementType: "geometry",
                                            stylers: [{ color: "#f5f5f5" }]
                                        },
                                        // ... more custom styles can be added here
                                    ]
                                }}
                            >
                                {reps.map((rep) => (
                                    <Marker
                                        key={rep.id}
                                        position={{ lat: rep.lastLat, lng: rep.lastLng }}
                                        onClick={() => setSelectedRep(rep)}
                                        icon={{
                                            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                        }}
                                    />
                                ))}

                                {selectedRep && (
                                    <InfoWindow
                                        position={{ lat: selectedRep.lastLat, lng: selectedRep.lastLng }}
                                        onCloseClick={() => setSelectedRep(null)}
                                    >
                                        <div className="p-2 max-w-[200px]">
                                            <h3 className="font-bold border-b pb-1 mb-2">{selectedRep.name}</h3>
                                            <p className="text-xs text-slate-500 mb-2">@{selectedRep.username}</p>
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-slate-400">COORDINATES</p>
                                                <code className="text-[10px] block bg-slate-100 p-1 rounded">
                                                    {selectedRep.lastLat.toFixed(4)}, {selectedRep.lastLng.toFixed(4)}
                                                </code>
                                                <Button size="sm" className="w-full text-[10px] h-8 mt-2" onClick={() => window.open(`https://www.google.com/maps?q=${selectedRep.lastLat},${selectedRep.lastLng}`)}>
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </InfoWindow>
                                )}
                            </GoogleMap>
                        ) : (
                            <div className="h-[600px] flex items-center justify-center bg-slate-50">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                            </div>
                        )}

                        {!loading && reps.length > 0 && (
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-md rounded-lg p-2 flex items-center gap-2 border border-slate-200">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Live Tracker On</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
