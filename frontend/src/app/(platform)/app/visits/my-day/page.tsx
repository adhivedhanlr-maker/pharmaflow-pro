"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Power, MapPin, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function MyDayPage() {
    const { user, token, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const toggleDuty = async () => {
        if (!user) return;
        setLoading(true);

        // If turning ON duty, request location permission first
        if (!user.isOnDuty) {
            if ("geolocation" in navigator) {
                try {
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                } catch (error) {
                    alert("You must allow location access to Start Duty.");
                    setLoading(false);
                    return;
                }
            } else {
                alert("Geolocation is not supported by your browser.");
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch(`${API_BASE}/users/duty`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ isOnDuty: !user.isOnDuty })
            });

            if (response.ok) {
                await refreshUser();
            } else {
                alert("Failed to update duty status.");
            }
        } catch (error) {
            console.error("Duty toggle failed:", error);
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGate allowedRoles={["SALES_REP"]}>
            <div className="max-w-md mx-auto space-y-6 pt-10">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">My Day</h1>
                    <p className="text-muted-foreground">Manage your daily work status & GPS tracking</p>
                </div>

                <Card className={`border-2 shadow-lg transition-all duration-300 ${user?.isOnDuty ? 'border-green-500 bg-green-50/50' : 'border-slate-200'}`}>
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="flex justify-center items-center gap-2">
                            Status:
                            {user?.isOnDuty ? (
                                <Badge className="bg-green-500 hover:bg-green-600 text-lg px-4 py-1">ON DUTY</Badge>
                            ) : (
                                <Badge variant="outline" className="text-lg px-4 py-1 text-slate-500">OFF DUTY</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {user?.isOnDuty
                                ? "You are currently clocked in. GPS Tracking is ACTIVE."
                                : "You are clocked out. GPS Tracking is DISABLED."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 pt-6">

                        <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 transition-all duration-500 ${user?.isOnDuty ? 'border-green-500 bg-green-100' : 'border-slate-200 bg-slate-50'}`}>
                            <Power className={`w-16 h-16 transition-colors duration-500 ${user?.isOnDuty ? 'text-green-600' : 'text-slate-300'}`} />
                            {user?.isOnDuty && (
                                <span className="absolute w-full h-full rounded-full border-4 border-green-500 animate-ping opacity-20"></span>
                            )}
                        </div>

                        <Button
                            size="lg"
                            className={`w-full h-14 text-lg font-bold shadow-md transition-all ${user?.isOnDuty ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            onClick={toggleDuty}
                            disabled={loading}
                        >
                            {loading ? "Updating..." : (user?.isOnDuty ? "END DUTY" : "START DUTY")}
                        </Button>

                        {user?.isOnDuty && (
                            <div className="w-full bg-white/50 rounded-lg p-4 border border-green-100 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>Started at: {format(new Date(), 'hh:mm a')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>GPS Signal: Active</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Alert>
                    {user?.isOnDuty ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
                    <AlertTitle>Privacy Notice</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                        Your location is only shared with the admin while you are explicitly <strong>ON DUTY</strong>.
                        When you turn off duty mode, all location tracking stops immediately.
                    </AlertDescription>
                </Alert>
            </div>
        </RoleGate>
    );
}
