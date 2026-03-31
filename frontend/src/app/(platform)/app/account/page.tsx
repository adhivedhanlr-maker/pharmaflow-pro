"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    BILLING_OPERATOR: "Billing",
    WAREHOUSE_MANAGER: "Warehouse",
    ACCOUNTANT: "Accountant",
    SALES_REP: "Sales Rep",
};

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-violet-100 text-violet-700",
    BILLING_OPERATOR: "bg-blue-100 text-blue-700",
    WAREHOUSE_MANAGER: "bg-amber-100 text-amber-700",
    ACCOUNTANT: "bg-green-100 text-green-700",
    SALES_REP: "bg-orange-100 text-orange-700",
};

export default function MyAccountPage() {
    const { user, token } = useAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        setSaving(true);
        try {
            const controller = new AbortController();
            const tid = window.setTimeout(() => controller.abort(), 10000);
            const res = await fetch(`${API_BASE}/users/me/password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword }),
                signal: controller.signal,
            });
            window.clearTimeout(tid);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to update password");
            toast.success("Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Network error");
        } finally {
            setSaving(false);
        }
    };

    const role = user?.role || "";

    return (
        <div className="space-y-6 max-w-md">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
                <p className="text-muted-foreground text-sm">Your profile and password settings.</p>
            </div>

            {/* Profile info */}
            <Card>
                <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                        <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-lg leading-tight truncate">{user?.name || "—"}</p>
                        <p className="text-sm text-muted-foreground truncate">@{user?.username || "—"}</p>
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || "bg-slate-100 text-slate-600"}`}>
                            {ROLE_LABELS[role] || role}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Change password */}
            <Card>
                <div className="py-3 px-5 border-b bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-slate-500" />
                        <p className="text-sm font-semibold text-slate-700">Change Password</p>
                    </div>
                </div>
                <CardContent className="p-5">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Current Password</label>
                            <div className="relative">
                                <Input
                                    type={showCurrent ? "text" : "password"}
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowCurrent(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showNew ? "text" : "password"}
                                    placeholder="At least 6 characters"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowNew(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Confirm New Password</label>
                            <Input
                                type="password"
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Update Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
