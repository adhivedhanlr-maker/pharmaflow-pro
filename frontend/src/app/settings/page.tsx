"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
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
    Save,
    Upload,
    Loader2
} from "lucide-react";
import TwoFactorSetup from "@/components/settings/two-factor-setup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SettingsPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        companyName: "",
        gstin: "",
        email: "",
        phone: "",
        address: "",
        logoUrl: ""
    });

    useEffect(() => {
        if (token) {
            fetchProfile();
        }
    }, [token]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/business-profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setFormData({
                        companyName: data.companyName || "",
                        gstin: data.gstin || "",
                        email: data.email || "",
                        phone: data.phone || "",
                        address: data.address || "",
                        logoUrl: data.logoUrl || ""
                    });
                    if (data.logoUrl) {
                        setLogoPreview(data.logoUrl);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Profile Data
            const profileRes = await fetch(`${API_BASE}/business-profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyName: formData.companyName,
                    gstin: formData.gstin,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address
                })
            });

            if (!profileRes.ok) throw new Error("Failed to save profile");

            // 2. Upload Logo if changed
            if (logoFile) {
                const uploadData = new FormData();
                uploadData.append("file", logoFile);

                const logoRes = await fetch(`${API_BASE}/business-profile/upload-logo`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: uploadData
                });

                if (!logoRes.ok) throw new Error("Failed to upload logo");

                // Refresh to get new URL (though we could just update local state)
                fetchProfile();
            } else {
                alert("Settings saved successfully!");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Configuration & Settings</h1>
                <p className="text-muted-foreground">Manage your distributor profile and system preferences.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Distributor Profile</CardTitle>
                        <CardDescription>This information will appear on your invoices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Logo Upload Section */}
                            <div className="flex-shrink-0">
                                <label className="block text-sm font-medium mb-2">Company Logo</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 w-40 h-40 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('logo-upload')?.click()}>
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo Preview"
                                            className="h-full w-full object-contain"
                                            onError={() => setLogoPreview(null)}
                                        />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <Upload className="h-8 w-8 mx-auto mb-2" />
                                            <span className="text-xs">Upload Logo</span>
                                        </div>
                                    )}
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center w-40">
                                    Recommended: 200x200px PNG or JPG
                                </p>
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Company Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Antigravity Medical Systems"
                                            className="pl-8"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">GSTIN</label>
                                    <div className="relative">
                                        <BadgeCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="27AAACN1234F1Z1"
                                            className="pl-8 uppercase font-mono"
                                            value={formData.gstin}
                                            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Contact Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="info@pharmaflow.pro"
                                                className="pl-8"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="+91 22 1234 5678"
                                                className="pl-8"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="123 Pharma Plaza, Industrial Area, Pune"
                                            className="pl-8"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Configuration
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <TwoFactorSetup />
            </div>
        </div>
    );
}

