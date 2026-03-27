"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RoleGate } from "@/components/auth/role-gate";
import { SettingsBreadcrumb } from "@/components/ui/settings-breadcrumb";
import { Save, Loader2, ShieldAlert } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULTS, type Permission } from "@/lib/permissions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const ROLE_LABELS: Record<string, string> = {
    BILLING_OPERATOR: "Billing Operator",
    WAREHOUSE_MANAGER: "Warehouse Manager",
    ACCOUNTANT: "Accountant",
    SALES_REP: "Sales Representative",
};

export default function RolePermissionsPage() {
    const { token } = useAuth();
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({ ...ROLE_DEFAULTS });
    const [savingPerms, setSavingPerms] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE}/permissions/roles`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setRolePermissions(data); })
            .catch(() => {});
    }, [token]);

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
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ permissions: rolePermissions[role] ?? [] }),
            });
        } finally {
            setSavingPerms(false);
        }
    };

    const resetRolePermissions = async (role: string) => {
        await fetch(`${API_BASE}/permissions/roles/${role}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        setRolePermissions(prev => ({ ...prev, [role]: ROLE_DEFAULTS[role] ?? [] }));
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
                    <p className="text-slate-500 max-w-sm">Only administrators can manage role permissions.</p>
                    <Button variant="outline" onClick={() => window.location.href = "/app"}>Back to Dashboard</Button>
                </div>
            }
        >
            <div className="space-y-6 max-w-3xl">
                <SettingsBreadcrumb crumbs={[
                    { label: "Settings", href: "/app/settings" },
                    { label: "Role Permissions" },
                ]} />

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Role Permissions</h1>
                    <p className="text-muted-foreground">Configure what each staff role can access by default.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Role Access Control</CardTitle>
                        <CardDescription>
                            Individual users can have additional overrides set from the Users page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(["BILLING_OPERATOR", "WAREHOUSE_MANAGER", "ACCOUNTANT", "SALES_REP"] as const).map(role => {
                            const perms = rolePermissions[role] ?? ROLE_DEFAULTS[role] ?? [];
                            return (
                                <div key={role} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-slate-800">{ROLE_LABELS[role]}</h3>
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
            </div>
        </RoleGate>
    );
}
