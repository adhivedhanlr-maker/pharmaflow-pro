"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, Search, MapPin, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Dynamic import for Leaflet components to avoid SSR errors
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import("react-leaflet").then(mod => mod.useMap), { ssr: false });

// Helper to fix Leaflet icon issue in Next.js
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const fixLeafletIcon = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

interface PharmacyMapPickerProps {
    onSelect: (place: any) => void;
    initialSearch?: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = (useMap as any)();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function PharmacyMapPicker({ onSelect, initialSearch = "" }: PharmacyMapPickerProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [center, setCenter] = useState<[number, number]>([12.2513, 75.1328]); // Nileshwar default
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fixLeafletIcon();
        if (initialSearch) {
            handleSearch(initialSearch);
        }
    }, []);

    const handleSearch = async (query: string) => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        try {
            // Search for pharmacies specifically in Nileshwar, Kanhangad, Kasaragod area
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + " Pharmacy Kerala")}&limit=10&addressdetails=1`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                if (data.length > 0) {
                    setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                }
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col h-[80vh] border-none rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-4 border-b flex gap-3 bg-white/50">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Search for a pharmacy (e.g. 'JAS Medical')"
                        className="pl-9 h-11 bg-white border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all rounded-xl shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                    />
                </div>
                <Button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={isSearching}
                    className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search Area"}
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar results */}
                <div className="w-80 border-r overflow-y-auto bg-slate-50/50 p-3 space-y-3 custom-scrollbar">
                    {results.length === 0 && !isSearching && (
                        <div className="text-center py-20 px-4">
                            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-6 w-6 text-blue-400" />
                            </div>
                            <p className="text-slate-600 font-medium">Find Real Pharmacies</p>
                            <p className="text-slate-400 text-xs mt-1">Search for medical stores in Nileshwar, Kanhangad or Kasaragod.</p>
                        </div>
                    )}
                    {results.map((res, idx) => (
                        <div
                            key={res.place_id}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            className={`p-4 border rounded-xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md animate-in slide-in-from-left-4 duration-300 fill-mode-both ${selectedId === res.place_id
                                ? 'border-blue-500 bg-white shadow-lg ring-1 ring-blue-500'
                                : 'bg-white border-slate-100'
                                }`}
                            onClick={() => {
                                setSelectedId(res.place_id);
                                setCenter([parseFloat(res.lat), parseFloat(res.lon)]);
                            }}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-bold text-sm text-slate-800 leading-tight">{res.display_name.split(',')[0]}</p>
                                {selectedId === res.place_id && <div className="bg-blue-600 rounded-full p-0.5"><Check className="h-3 w-3 text-white" /></div>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{res.display_name}</p>
                            {selectedId === res.place_id && (
                                <Button
                                    size="sm"
                                    className="w-full mt-4 h-8 text-xs font-bold rounded-lg bg-slate-900"
                                    onClick={() => onSelect(res)}
                                >
                                    Select & Import Details
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Map View */}
                <div className="flex-1 relative">
                    <MapContainer
                        center={center}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={true}
                        className="z-0"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
                        />
                        <MapUpdater center={center} />
                        {results.map((res) => (
                            <Marker
                                key={res.place_id}
                                position={[parseFloat(res.lat), parseFloat(res.lon)]}
                                eventHandlers={{
                                    click: () => setSelectedId(res.place_id),
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div className="p-2 min-w-[180px]">
                                        <h3 className="font-bold text-sm text-slate-900">{res.display_name.split(',')[0]}</h3>
                                        <p className="text-[10px] text-slate-500 my-2 leading-tight">{res.display_name}</p>
                                        <Button
                                            size="sm"
                                            className="w-full h-8 text-xs font-bold rounded-lg"
                                            onClick={() => onSelect(res)}
                                        >
                                            Use This Pharmacy
                                        </Button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Floating Center Indicator */}
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-200 pointer-events-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Live Map Search</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
