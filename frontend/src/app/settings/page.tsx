"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    BadgeCheck,
    Save
} from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Configuration & Settings</h1>
                <p className="text-muted-foreground">Manage your distributor profile and system preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Distributor Profile</CardTitle>
                        <CardDescription>This information will appear on your invoices and reports.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Antigravity Medical Systems" className="pl-8" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">GSTIN</label>
                            <div className="relative">
                                <BadgeCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="27AAACN1234F1Z1" className="pl-8 uppercase font-mono" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contact Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="info@pharmaflow.pro" className="pl-8" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="+91 22 1234 5678" className="pl-8" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="123 Pharma Plaza, Industrial Area, Pune" className="pl-8" />
                            </div>
                        </div>

                        <Button className="w-full">
                            <Save className="mr-2 h-4 w-4" /> Save Configuration
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Security & Access</CardTitle>
                        <CardDescription>Manage user roles and system security.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground italic">
                            Role-Based Access Control (RBAC) is active. Only Admins can modify these settings.
                        </p>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm">Two-Factor Authentication</p>
                                <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
                            </div>
                            <Button variant="outline" size="sm">Enable</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
