"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MapPin,
    Search,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Navigation,
    Store
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { CustomerDialog } from "@/components/billing/customer-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function VisitsPage() {
    const { token } = useAuth();
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [nearbyMode, setNearbyMode] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        if (token) fetchCustomers();
    }, [token]);

    const toggleNearby = () => {
        if (!nearbyMode) {
            if (!navigator.geolocation) {
                alert("Geolocation not supported");
                return;
            }
            navigator.geolocation.getCurrentPosition((pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setNearbyMode(true);
            }, (err) => alert("Failed to get location: " + err.message));
        } else {
            setNearbyMode(false);
            setUserLocation(null);
        }
    };

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/parties/customers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.data || data);
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    };

    const handleCheckIn = async (customer: any) => {
        setCheckingIn(customer.id);

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setCheckingIn(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            // Default to 0,0 if customer coords are missing (handle with caution)
            const custLat = customer.latitude || 0;
            const custLng = customer.longitude || 0;

            const distance = calculateDistance(latitude, longitude, custLat, custLng);
            const isValid = distance < 500; // 500m radius

            try {
                const response = await fetch(`${API_BASE}/visits/check-in`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        customerId: customer.id,
                        latitude,
                        longitude,
                        distance: Math.round(distance),
                        status: isValid ? "VERIFIED" : "MISMATCH"
                    })
                });

                if (response.ok) {
                    if (isValid) {
                        alert(`Success! Check-in verified at ${customer.name}. You are within ${Math.round(distance)}m.`);
                        // Navigate to orders page to capture requirements
                        window.location.href = `/orders?customerId=${customer.id}`;
                    } else {
                        alert(`Check-in recorded, but you are ${Math.round(distance)}m away. Distance mismatch flagged.`);
                        // Optional: Still navigate but with a flag? For now just stay.
                    }
                } else {
                    const errorMsg = await response.text();
                    alert(`Server Error: ${response.status} - ${errorMsg || "Failed to record check-in"}`);
                }
            } catch (error) {
                console.error("Check-in Error:", error);
                alert("Network Error: Could not connect to the server. Please check your internet.");
            } finally {
                setCheckingIn(null);
            }
        }, (error) => {
            alert("Location Error: " + error.message + ". Please ensure GPS is enabled and signal is strong.");
            setCheckingIn(null);
        }, {
            enableHighAccuracy: true,
            timeout: 11000,
            maximumAge: 60000
        });
    };

    const getProcessedCustomers = () => {
        let items = customers.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.address?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (nearbyMode && userLocation) {
            return items.map(c => ({
                ...c,
                distance: (c.latitude && c.longitude)
                    ? calculateDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude)
                    : Infinity
            })).sort((a, b) => a.distance - b.distance);
        }

        return items;
    };

    const filteredCustomers = getProcessedCustomers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customer Visits</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Verify your location and start shop visits.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                        variant={nearbyMode ? "default" : "outline"}
                        size="sm"
                        onClick={toggleNearby}
                        className={cn(nearbyMode && "bg-blue-600")}
                    >
                        <Navigation className={cn("h-4 w-4 mr-2", nearbyMode && "animate-pulse")} />
                        {nearbyMode ? "Nearby Only" : "Show Nearby"}
                    </Button>
                    <CustomerDialog type="customer" onSuccess={fetchCustomers} />
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search pharmacies..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-slate-100 rounded-t-xl" />
                            <CardContent className="h-20" />
                        </Card>
                    ))
                ) : filteredCustomers.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <Store className="h-12 w-12 mx-auto text-slate-300" />
                        <p className="text-slate-500">No customers found matching your search.</p>
                    </div>
                ) : filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="group hover:border-primary/50 transition-all">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Store className="h-5 w-5" />
                                </div>
                                {customer.latitude && customer.longitude ? (
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                                            GPS Mapped
                                        </Badge>
                                        {nearbyMode && customer.distance !== Infinity && (
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                {customer.distance > 1000 ? `${(customer.distance / 1000).toFixed(1)} km` : `${Math.round(customer.distance)} m`} away
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                                        No Coords
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="mt-4 text-lg">{customer.name}</CardTitle>
                            <p className="text-sm text-muted-foreground line-clamp-1">{customer.address || "No address recorded"}</p>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full flex items-center gap-2 h-11"
                                variant={checkingIn === customer.id ? "ghost" : "default"}
                                onClick={() => handleCheckIn(customer)}
                                disabled={!!checkingIn}
                            >
                                {checkingIn === customer.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Navigation className="h-4 w-4" />
                                        Check In
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-bold">GPS Verification Notice</p>
                    <p className="mt-1">
                        For accurate tracking, we recommend using the **PharmaFlow Mobile App**.
                        Web browser check-ins are recorded but may have lower location precision depending on your internet connection.
                    </p>
                </div>
            </div>
        </div>
    );
}
