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
    Loader2,
    ShieldAlert,
    Database,
    ArrowRight,
} from "lucide-react";
import TwoFactorSetup from "@/components/settings/two-factor-setup";
import { RoleGate } from "@/components/auth/role-gate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isAdminLikeRole } from "@/lib/roles";
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULTS, type Permission } from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SettingsPage() {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        companyName: "",
        gstin: "",
        panNo: "",
        dlNo: "",
        fssaiNo: "",
        email: "",
        phone: "",
        address: "",
        logoUrl: "",
        bankName: "",
        bankBranch: "",
        bankAccountNo: "",
        bankIfsc: "",
        showLogo: true,
    });
    const [brandingName, setBrandingName] = useState("");
    const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({ ...ROLE_DEFAULTS });
    const [savingPerms, setSavingPerms] = useState(false);

    useEffect(() => {
        if (token && isAdminLikeRole(user?.role)) {
            fetchProfile();
            fetchRolePermissions();
        }
    }, [token, user]);

    const fetchRolePermissions = async () => {
        try {
            const res = await fetch(`${API_BASE}/permissions/roles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setRolePermissions(await res.json());
        } catch { /* use defaults */ }
    };

    const toggleRolePermission = (role: string, perm: string) => {
        setRolePermissions(prev => {
            const current = prev[role] ?? [];
            const next = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
            return { ...prev, [role]: next };
        });
    };

    const saveRolePermissions = async (role: string) => {
        setSavingPerms(true);
        try {
            await fetch(`${API_BASE}/permissions/roles/${role}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ permissions: rolePermissions[role] ?? [] }),
            });
        } finally {
            setSavingPerms(false);
        }
    };

    const resetRolePermissions = async (role: string) => {
        await fetch(`${API_BASE}/permissions/roles/${role}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        setRolePermissions(prev => ({ ...prev, [role]: ROLE_DEFAULTS[role] ?? [] }));
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const [profileResponse, brandingResponse] = await Promise.all([
                fetch(`${API_BASE}/business-profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`),
            ]);

            const profileText = profileResponse.ok ? await profileResponse.text() : "";
            const profileData = profileText ? JSON.parse(profileText) : null;
            const brandingData = brandingResponse.ok ? await brandingResponse.json() : null;

            const companyName = profileData?.companyName || brandingData?.companyName || "";
            const logoUrl = profileData?.logoUrl || brandingData?.logoUrl || "";

            setBrandingName(brandingData?.companyName || "");
            setBrandingLogoUrl(brandingData?.logoUrl || "");
            setFormData({
                companyName,
                gstin: profileData?.gstin || "",
                panNo: profileData?.panNo || "",
                dlNo: profileData?.dlNo || "",
                fssaiNo: profileData?.fssaiNo || "",
                email: profileData?.email || "",
                phone: profileData?.phone || "",
                address: profileData?.address || "",
                logoUrl,
                bankName: profileData?.bankName || "",
                bankBranch: profileData?.bankBranch || "",
                bankAccountNo: profileData?.bankAccountNo || "",
                bankIfsc: profileData?.bankIfsc || "",
                showLogo: profileData?.showLogo ?? true,
            });

            if (logoUrl) {
                setLogoPreview(logoUrl);
            } else {
                setLogoPreview(null);
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const hasLogo = Boolean(logoPreview || formData.logoUrl || brandingLogoUrl);
    const missingFields = [
        !formData.companyName && "company name",
        !hasLogo && "company logo",
        !formData.gstin && "GSTIN",
        !formData.email && "contact email",
        !formData.phone && "phone number",
        !formData.address && "full address",
    ].filter(Boolean) as string[];

    const alertMessage = missingFields.length > 0
        ? `Complete ${missingFields.join(", ")} to finish your invoice profile.`
        : null;

    const companyNamePlaceholder = brandingName || "Antigravity Medical Systems";
    const logoHint = brandingLogoUrl && !logoPreview
        ? "Tenant logo is available and will be used until you upload a dedicated invoice logo."
        : "Recommended: 200x200px PNG or JPG";

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
                    panNo: formData.panNo,
                    dlNo: formData.dlNo,
                    fssaiNo: formData.fssaiNo,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    bankName: formData.bankName,
                    bankBranch: formData.bankBranch,
                    bankAccountNo: formData.bankAccountNo,
                    bankIfsc: formData.bankIfsc,
                    showLogo: formData.showLogo,
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

                fetchProfile();
                alert("Settings and logo saved successfully!");
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
        <RoleGate
            allowedRoles={["ADMIN"]}
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-500 max-w-sm">
                        Only administrators can access system configuration and settings.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuration & Settings</h1>
                    <p className="text-muted-foreground">Manage your distributor profile and system preferences.</p>
                </div>

                {alertMessage && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                        <ShieldAlert className="h-4 w-4 !text-amber-700" />
                        <AlertTitle>Complete distributor profile</AlertTitle>
                        <AlertDescription>{alertMessage}</AlertDescription>
                    </Alert>
                )}

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
                                        {logoHint}
                                    </p>
                                    <label className="flex items-center gap-2 mt-3 cursor-pointer w-40">
                                        <input
                                            type="checkbox"
                                            checked={formData.showLogo}
                                            onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        <span className="text-xs text-slate-600 font-medium">Show on invoice</span>
                                    </label>
                                </div>

                                {/* Form Fields */}
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Company Name</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={companyNamePlaceholder}
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

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">PAN</label>
                                            <Input
                                                placeholder="ABCDE1234F"
                                                className="uppercase font-mono"
                                                value={formData.panNo}
                                                onChange={(e) => setFormData({ ...formData, panNo: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Drug Licence No. (DL)</label>
                                            <Input
                                                placeholder="DL No."
                                                value={formData.dlNo}
                                                onChange={(e) => setFormData({ ...formData, dlNo: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">FSSAI No.</label>
                                            <Input
                                                placeholder="FSSAI Licence No."
                                                value={formData.fssaiNo}
                                                onChange={(e) => setFormData({ ...formData, fssaiNo: e.target.value })}
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

                                    <div className="space-y-3 border-t pt-4 mt-2">
                                        <label className="text-sm font-semibold text-slate-600">Bank Details (for invoice footer)</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Bank Name</label>
                                                <Input placeholder="e.g. CANARA BANK" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Branch</label>
                                                <Input placeholder="Branch name" value={formData.bankBranch} onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Account Number</label>
                                                <Input placeholder="Account No." className="font-mono" value={formData.bankAccountNo} onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">IFSC Code</label>
                                                <Input placeholder="CNRB0000724" className="uppercase font-mono" value={formData.bankIfsc} onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })} />
                                            </div>
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

                    {/* Role Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Role Permissions</CardTitle>
                            <CardDescription>
                                Configure what each staff role can access by default. Individual users can have additional overrides set from the Users page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(['BILLING_OPERATOR', 'WAREHOUSE_MANAGER', 'ACCOUNTANT', 'SALES_REP'] as const).map(role => {
                                const roleLabel: Record<string, string> = {
                                    BILLING_OPERATOR: 'Billing Operator',
                                    WAREHOUSE_MANAGER: 'Warehouse Manager',
                                    ACCOUNTANT: 'Accountant',
                                    SALES_REP: 'Sales Representative',
                                };
                                const perms = rolePermissions[role] ?? ROLE_DEFAULTS[role] ?? [];
                                return (
                                    <div key={role} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-sm text-slate-800">{roleLabel[role]}</h3>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-xs text-slate-500"
                                                    onClick={() => resetRolePermissions(role)}
                                                >
                                                    Reset defaults
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs"
                                                    disabled={savingPerms}
                                                    onClick={() => saveRolePermissions(role)}
                                                >
                                                    {savingPerms ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                                    Save
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {ALL_PERMISSIONS.map(perm => (
                                                <div key={perm} className="flex items-center justify-between gap-3 py-1">
                                                    <Label className="text-xs font-normal text-slate-600 cursor-pointer">
                                                        {PERMISSION_LABELS[perm as Permission].label}
                                                    </Label>
                                                    <Switch
                                                        checked={perms.includes(perm)}
                                                        onCheckedChange={() => toggleRolePermission(role, perm)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <TwoFactorSetup />

                    {/* Data Management */}
                    <a href="/app/settings/data" className="block">
                        <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                            <CardContent className="flex items-center justify-between p-5">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 p-2.5 rounded-lg">
                                        <Database className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Data Management</p>
                                        <p className="text-xs text-slate-500">Export data to Excel, import customers / suppliers / products in bulk</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                            </CardContent>
                        </Card>
                    </a>
                </div>
            </div>
        </RoleGate>
    );
}
