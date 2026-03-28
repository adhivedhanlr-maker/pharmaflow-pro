"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, MapPin, Check, X, Map, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

// @ts-ignore
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
    onClose?: () => void;
    initialSearch?: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export default function PharmacyMapPicker({ onSelect, onClose, initialSearch = "" }: PharmacyMapPickerProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [center, setCenter] = useState<[number, number]>([12.2513, 75.1328]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Mobile tab: "list" | "map"
    const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

    useEffect(() => {
        fixLeafletIcon();
        if (initialSearch) handleSearch(initialSearch);
    }, []);

    const handleSearch = async (query: string) => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + " Pharmacy Kerala")}&limit=10&addressdetails=1`
            );
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                if (data.length > 0) setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden" style={{ height: "min(80vh, 600px)" }}>

            {/* ── Header: search bar + close ───────────────────────────── */}
            <div className="flex items-center gap-2 p-3 border-b bg-white shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search pharmacy (e.g. 'JAS Medical')"
                        className="pl-9 h-10 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                    />
                </div>
                <Button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={isSearching}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* ── Mobile tab switcher ──────────────────────────────────── */}
            <div className="flex md:hidden border-b bg-slate-50 shrink-0">
                <button
                    onClick={() => setMobileTab("list")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mobileTab === "list" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-500"}`}
                >
                    <List className="h-4 w-4" /> Results {results.length > 0 && `(${results.length})`}
                </button>
                <button
                    onClick={() => setMobileTab("map")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mobileTab === "map" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-500"}`}
                >
                    <Map className="h-4 w-4" /> Map
                </button>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Results list — full width on mobile (hidden when map tab active), fixed sidebar on desktop */}
                <div className={`
                    overflow-y-auto bg-slate-50 p-3 space-y-2
                    ${mobileTab === "map" ? "hidden" : "flex-1"}
                    md:flex md:flex-col md:w-72 md:flex-none md:border-r
                `}>
                    {results.length === 0 && !isSearching && (
                        <div className="text-center py-16 px-4">
                            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Search className="h-5 w-5 text-blue-400" />
                            </div>
                            <p className="text-slate-600 font-medium text-sm">Find Real Pharmacies</p>
                            <p className="text-slate-400 text-xs mt-1">Search for medical stores in Nileshwar, Kanhangad or Kasaragod.</p>
                        </div>
                    )}
                    {isSearching && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    )}
                    {results.map((res, idx) => (
                        <div
                            key={res.place_id}
                            className={`p-3 border rounded-xl cursor-pointer transition-all ${
                                selectedId === res.place_id
                                    ? "border-blue-500 bg-white shadow ring-1 ring-blue-500"
                                    : "bg-white border-slate-100 hover:border-slate-300"
                            }`}
                            onClick={() => {
                                setSelectedId(res.place_id);
                                setCenter([parseFloat(res.lat), parseFloat(res.lon)]);
                                // Switch to map on mobile when selecting
                                setMobileTab("map");
                            }}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-semibold text-sm text-slate-800 leading-tight">
                                    {res.display_name.split(",")[0]}
                                </p>
                                {selectedId === res.place_id && (
                                    <div className="bg-blue-600 rounded-full p-0.5 shrink-0">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {res.display_name}
                            </p>
                            {selectedId === res.place_id && (
                                <Button
                                    size="sm"
                                    className="w-full mt-3 h-8 text-xs font-bold rounded-lg bg-slate-900"
                                    onClick={(e) => { e.stopPropagation(); onSelect(res); }}
                                >
                                    Select & Import Details
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Map — hidden on mobile when list tab active */}
                <div className={`
                    flex-1 relative
                    ${mobileTab === "list" ? "hidden md:block" : "block"}
                `}>
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
                                eventHandlers={{ click: () => { setSelectedId(res.place_id); setMobileTab("map"); } }}
                            >
                                <Popup>
                                    <div className="p-2 min-w-[160px]">
                                        <h3 className="font-bold text-sm text-slate-900">{res.display_name.split(",")[0]}</h3>
                                        <p className="text-[10px] text-slate-500 my-2 leading-tight">{res.display_name}</p>
                                        <Button size="sm" className="w-full h-8 text-xs font-bold rounded-lg" onClick={() => onSelect(res)}>
                                            Use This Pharmacy
                                        </Button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg shadow border border-slate-200 pointer-events-none">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Live Map</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
