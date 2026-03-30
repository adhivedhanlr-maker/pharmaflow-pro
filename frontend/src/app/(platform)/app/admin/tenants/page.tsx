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
import { Building2, Loader2, LogIn, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
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
    const [supportDialogTenant, setSupportDialogTenant] = useState<Tenant | null>(null);
    const [supportReason, setSupportReason] = useState("");
    const [startingSupportAccess, setStartingSupportAccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [deleteDialogTenant, setDeleteDialogTenant] = useState<Tenant | null>(null);
    const [deleting, setDeleting] = useState(false);
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

    const handleEditTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTenant) return;
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin/${editingTenant.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    companyName: formData.companyName.trim(),
                    customDomain: formData.customDomain.trim() || null,
                    logoUrl: formData.logoUrl.trim() || null,
                    loginTitle: formData.loginTitle.trim() || null,
                    loginSubtitle: formData.loginSubtitle.trim() || null,
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || "Failed to update tenant");
            setEditingTenant(null);
            setFormData(INITIAL_FORM);
            await fetchTenants();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update tenant");
        } finally {
            setSaving(false);
        }
    };

    const deleteTenant = async () => {
        if (!deleteDialogTenant) return;
        setDeleting(true);
        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin/${deleteDialogTenant.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || "Failed to delete tenant");
            setDeleteDialogTenant(null);
            await fetchTenants();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete tenant");
        } finally {
            setDeleting(false);
        }
    };

    const getTenantAccessUrl = (tenant: Tenant) => {
        if (tenant.customDomain) {
            return `${window.location.protocol}//${tenant.customDomain}`;
        }

        const host = window.location.host;
        const parts = host.split(".");
        if (parts.length >= 2 && host !== "localhost:3000" && host !== "127.0.0.1:3000") {
            return `${window.location.protocol}//${tenant.slug}.${host}`;
        }

        return window.location.origin;
    };

    const startSupportAccess = async () => {
        if (!supportDialogTenant) return;

        setStartingSupportAccess(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/tenant-branding/admin/${supportDialogTenant.id}/support-access`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reason: supportReason.trim(),
                    returnUrl: `${window.location.origin}/app/admin/tenants`,
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.message || "Failed to start support access");
            }

            const targetBaseUrl = getTenantAccessUrl(supportDialogTenant);
            const targetUrl = `${targetBaseUrl}/login?support_token=${encodeURIComponent(data.accessToken)}`;
            window.location.href = targetUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start support access");
        } finally {
            setStartingSupportAccess(false);
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
                    <Button variant="outline" onClick={() => (window.location.href = "/app")}>Back to Dashboard</Button>
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
                    {/* Edit Tenant Dialog */}
                    <Dialog open={!!editingTenant} onOpenChange={(open) => { if (!open) { setEditingTenant(null); setFormData(INITIAL_FORM); } }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Client — {editingTenant?.companyName}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleEditTenant} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Domain</Label>
                                    <Input placeholder="bluedots.pharmaflow.eflybe.com" value={formData.customDomain} onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Login Title</Label>
                                    <Input placeholder="Welcome Back" value={formData.loginTitle} onChange={(e) => setFormData({ ...formData, loginTitle: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Login Subtitle</Label>
                                    <Input placeholder="Sign in to manage your distribution" value={formData.loginSubtitle} onChange={(e) => setFormData({ ...formData, loginSubtitle: e.target.value })} />
                                </div>
                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={!!deleteDialogTenant} onOpenChange={(open) => { if (!open) setDeleteDialogTenant(null); }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Client Tenant</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                <p className="text-sm text-slate-600">
                                    Are you sure you want to delete <span className="font-semibold">{deleteDialogTenant?.companyName}</span>? This cannot be undone and will only succeed if the tenant has no data.
                                </p>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogTenant(null)}>Cancel</Button>
                                    <Button variant="destructive" className="flex-1" onClick={() => void deleteTenant()} disabled={deleting}>
                                        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={!!supportDialogTenant}
                        onOpenChange={(open) => {
                            if (!open) {
                                setSupportDialogTenant(null);
                                setSupportReason("");
                            }
                        }}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Access Client</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Entering support access for {supportDialogTenant?.companyName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        This starts a temporary audited support session with admin-level access inside the client portal.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportReason">Support Reason</Label>
                                    <Input
                                        id="supportReason"
                                        placeholder="Example: Investigating stock sync issue"
                                        value={supportReason}
                                        onChange={(e) => setSupportReason(e.target.value)}
                                    />
                                </div>
                                <Button
                                    className="w-full gap-2"
                                    onClick={() => void startSupportAccess()}
                                    disabled={startingSupportAccess || supportReason.trim().length === 0}
                                >
                                    {startingSupportAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                                    Start Support Access
                                </Button>
                            </div>
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
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {!tenant.isDefault && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => setSupportDialogTenant(tenant)}
                                            >
                                                <LogIn className="h-4 w-4" />
                                                Access Client
                                            </Button>
                                        )}
                                        {!tenant.isDefault && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => {
                                                    setEditingTenant(tenant);
                                                    setFormData({
                                                        slug: tenant.slug,
                                                        companyName: tenant.companyName,
                                                        customDomain: tenant.customDomain || "",
                                                        logoUrl: tenant.logoUrl || "",
                                                        loginTitle: tenant.loginTitle || "",
                                                        loginSubtitle: tenant.loginSubtitle || "",
                                                    });
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Edit
                                            </Button>
                                        )}
                                        {!tenant.isDefault && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                onClick={() => setDeleteDialogTenant(tenant)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        )}
                                        <span className="text-sm text-slate-500 px-1">
                                            {tenant.isActive ? "Active" : "Disabled"}
                                        </span>
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
