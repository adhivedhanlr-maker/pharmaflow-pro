"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, Save, Search, Plus, X, MapPin } from "lucide-react";
import { format } from "date-fns";


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
    id: string;
    name: string;
    role: string;
}

interface Customer {
    id: string;
    name: string;
    address: string;
    city: string;
}

export default function RoutePlannerPage() {
    const { token } = useAuth();
    // const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Data
    const [reps, setReps] = useState<User[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Selection
    const [selectedRep, setSelectedRep] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

    // Route Building
    const [routeStops, setRouteStops] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (token) {
            fetchReps();
            fetchCustomers();
        }
    }, [token]);

    const fetchReps = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only staff/reps if needed, or show all
                setReps(data);
            }
        } catch (error) {
            console.error("Failed to fetch reps", error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_BASE}/parties`, { // Assuming /parties endpoint returns customers
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        }
    };

    const addToRoute = (customer: Customer) => {
        if (routeStops.find(s => s.id === customer.id)) return;
        setRouteStops([...routeStops, customer]);
    };

    const removeFromRoute = (customerId: string) => {
        setRouteStops(routeStops.filter(s => s.id !== customerId));
    };

    const saveRoute = async () => {
        if (!selectedRep || !selectedDate || routeStops.length === 0) {
            alert("Error: Please select a rep, date, and at least one stop.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/routes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    repId: selectedRep,
                    date: selectedDate,
                    stops: routeStops.map(s => s.id)
                })
            });

            if (res.ok) {
                alert("Success: Route created successfully!");
                setRouteStops([]);
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || "Failed to create route"}`);
            }
        } catch (error) {
            alert("Error: Network error");
        } finally {
            setLoading(false);
        }
    };

    // Filter customers for search
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !routeStops.find(s => s.id === c.id) // Exclude already added
    );

    return (
        <RoleGate allowedRoles={["ADMIN", "MANAGER"]}>
            <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Route Planner</h1>
                        <p className="text-muted-foreground">Assign daily routes to sales representatives.</p>
                    </div>
                    <Button onClick={saveRoute} disabled={loading || routeStops.length === 0}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Publish Route
                    </Button>
                </div>

                {/* Controls */}
                <Card>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/3">
                            <label className="text-xs font-medium mb-1 block">Select Representative</label>
                            <Select onValueChange={setSelectedRep} value={selectedRep}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Rep" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reps.map(rep => (
                                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-1/3">
                            <label className="text-xs font-medium mb-1 block">Select Date</label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Planner Workspace */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                    {/* Left: Available Customers */}
                    <Card className="flex flex-col min-h-0">
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="text-base">Available Customers</CardTitle>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search customers..."
                                    className="pl-8 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                            {filteredCustomers.map(customer => (
                                <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{customer.address}, {customer.city}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => addToRoute(customer)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <p className="text-center text-muted-foreground py-8 text-sm">No customers found.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Selected Route */}
                    <Card className="flex flex-col min-h-0 border-primary/20 bg-primary/5">
                        <CardHeader className="py-3 px-4 border-b bg-primary/10">
                            <CardTitle className="text-base text-primary">
                                Route Sequence ({routeStops.length})
                            </CardTitle>
                            <CardDescription>
                                Stops will be visited in this order.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                            {routeStops.map((customer, index) => (
                                <div key={customer.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                                    <div className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-medium truncate">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{customer.address}, {customer.city}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => removeFromRoute(customer.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {routeStops.length === 0 && (
                                <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                                    <MapPin className="h-8 w-8 opacity-20" />
                                    <p className="text-sm">Add customers from the left list to build a route.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </RoleGate>
    );
}
