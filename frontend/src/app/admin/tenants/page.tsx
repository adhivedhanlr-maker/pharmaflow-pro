"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { isAdminLikeRole } from "@/lib/roles";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PLATFORM_HOSTS = new Set([
    process.env.NEXT_PUBLIC_PLATFORM_HOST,
    "pharmaflow.eflybe.com",
    "localhost",
    "127.0.0.1",
].filter(Boolean) as string[]);

type Tenant = {
    id: string;
    slug: string;
    companyName: string;
    customDomain: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    loginTitle: string | null;
    loginSubtitle: string | null;
    isDefault: boolean;
    isActive: boolean;
    userCount: number;
    initialized: boolean;
    createdAt: string;
};

const INITIAL_FORM = {
    slug: "",
    companyName: "",
    customDomain: "",
    logoUrl: "",
    loginTitle: "",
    loginSubtitle: "",
};

export default function TenantManagementPage() {
    const router = useRouter();
    const { token, user } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [isPlatformHost, setIsPlatformHost] = useState<boolean | null>(null);

    useEffect(() => {
        setIsPlatformHost(PLATFORM_HOSTS.has(window.location.hostname));
    }, []);

    useEffect(() => {
        if (isPlatformHost === null) {
            return;
        }

        if (token && isAdminLikeRole(user?.role) && isPlatformHost) {
            fetchTenants();
        } else if (!isPlatformHost) {
            router.replace("/");
        }
    }, [token, user, isPlatformHost, router]);

    useEffect(() => {
        if (isPlatformHost === null) {
            return;
        }

        if (user && (!isPlatformHost || !isAdminLikeRole(user.role))) {
            router.replace("/");
        }
    }, [user, isPlatformHost, router]);

    const fetchTenants = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to load tenants");
            }

            const data = await response.json();
            setTenants(data);
        } catch (err) {
            setError("Only the platform admin tenant can manage clients.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    slug: formData.slug.trim().toLowerCase(),
                    companyName: formData.companyName.trim(),
                    customDomain: formData.customDomain.trim() || null,
                    logoUrl: formData.logoUrl.trim() || null,
                    loginTitle: formData.loginTitle.trim() || null,
                    loginSubtitle: formData.loginSubtitle.trim() || null,
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.message || "Failed to create tenant");
            }

            setFormData(INITIAL_FORM);
            setIsDialogOpen(false);
            await fetchTenants();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create tenant");
        } finally {
            setSaving(false);
        }
    };

    const toggleTenantStatus = async (tenant: Tenant) => {
        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin/${tenant.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    isActive: !tenant.isActive,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update tenant");
            }

            await fetchTenants();
        } catch {
            setError(`Failed to update ${tenant.companyName}.`);
        }
    };

    const deleteTenant = async (tenant: Tenant) => {
        if (!confirm(`Delete tenant "${tenant.companyName}"? This only works if it has no data.`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin/${tenant.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.message || "Failed to delete tenant");
            }

            await fetchTenants();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete tenant");
        }
    };

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
                        Only platform administrators can onboard client portals.
                    </p>
                    <Button variant="outline" onClick={() => (window.location.href = "/")}>Back to Dashboard</Button>
                </div>
            }
        >
            {isPlatformHost !== true ? null : (
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Client Tenants</h1>
                        <p className="text-slate-500 text-sm">
                            Create a new client portal, assign its domain, and let the client complete first-run admin setup.
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Client Tenant</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateTenant} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input
                                        id="companyName"
                                        placeholder="Bluedots Healthcare Pvt Ltd"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Tenant Slug</Label>
                                    <Input
                                        id="slug"
                                        placeholder="bluedots"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customDomain">Client Domain</Label>
                                    <Input
                                        id="customDomain"
                                        placeholder="bluedots.pharmaflow.eflybe.com"
                                        value={formData.customDomain}
                                        onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="logoUrl">Logo URL</Label>
                                    <Input
                                        id="logoUrl"
                                        placeholder="https://cdn.example.com/bluedots-logo.png"
                                        value={formData.logoUrl}
                                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="loginTitle">Login Title</Label>
                                    <Input
                                        id="loginTitle"
                                        placeholder="Welcome Back"
                                        value={formData.loginTitle}
                                        onChange={(e) => setFormData({ ...formData, loginTitle: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="loginSubtitle">Login Subtitle</Label>
                                    <Input
                                        id="loginSubtitle"
                                        placeholder="Sign in to the client portal"
                                        value={formData.loginSubtitle}
                                        onChange={(e) => setFormData({ ...formData, loginSubtitle: e.target.value })}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create Tenant
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
                    </Card>
                )}

                <div className="grid gap-4">
                    {loading ? (
                        <Card>
                            <CardContent className="pt-6 text-sm text-slate-500">Loading tenants...</CardContent>
                        </Card>
                    ) : (
                        tenants.map((tenant) => (
                            <Card key={tenant.id} className="border-slate-200">
                                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-3 text-lg">
                                            {tenant.logoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={tenant.logoUrl}
                                                    alt={tenant.companyName}
                                                    className="h-10 w-10 rounded-md object-contain border border-slate-200 bg-white p-1"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-md border border-slate-200 bg-white flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-slate-500" />
                                                </div>
                                            )}
                                            <span>{tenant.companyName}</span>
                                        </CardTitle>
                                        <CardDescription>{tenant.customDomain || `${tenant.slug}.pharmaflow.eflybe.com`}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tenant.isDefault && <Badge variant="secondary">Platform</Badge>}
                                        <Badge variant={tenant.initialized ? "default" : "outline"}>
                                            {tenant.initialized ? `${tenant.userCount} users` : "Needs setup"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between gap-4 text-sm">
                                    <div className="space-y-1 text-slate-500">
                                        <p><span className="font-medium text-slate-700">Slug:</span> {tenant.slug}</p>
                                        <p><span className="font-medium text-slate-700">Created:</span> {new Date(tenant.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {!tenant.isDefault && tenant.userCount === 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteTenant(tenant)}
                                                className="gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        )}
                                        <Label className="text-sm">
                                            {tenant.isActive ? "Active" : "Disabled"}
                                        </Label>
                                        <Button
                                            type="button"
                                            variant={tenant.isActive ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleTenantStatus(tenant)}
                                            disabled={tenant.isDefault}
                                        >
                                            {tenant.isActive ? "Disable" : "Enable"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
            )}
        </RoleGate>
    );
}
