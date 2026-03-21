"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TenantBranding = {
    slug: string;
    companyName: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    loginTitle: string;
    loginSubtitle: string;
    faviconUrl: string | null;
    requiresSetup: boolean;
};

const DEFAULT_BRANDING: TenantBranding = {
    slug: "default",
    companyName: "PharmaFlow Pro",
    logoUrl: null,
    primaryColor: "#2563eb",
    accentColor: "#0f172a",
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to manage your pharmaceutical distribution",
    faviconUrl: null,
    requiresSetup: false,
};

export default function LoginPage() {
    const searchParams = useSearchParams();
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
    const { login, establishSession } = useAuth();

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const host = window.location.host;
                const response = await fetch(
                    `${API_BASE}/public/tenant-branding?host=${encodeURIComponent(host)}`
                );

                if (!response.ok) {
                    return;
                }

                const data: TenantBranding = await response.json();
                setBranding({
                    ...DEFAULT_BRANDING,
                    ...data,
                });
            } catch {
                // Keep default branding when the tenant lookup is unavailable.
            }
        };

        fetchBranding();
    }, []);

    useEffect(() => {
        const supportToken = searchParams.get("support_token");
        if (!supportToken) {
            return;
        }

        try {
            const [, payload] = supportToken.split(".");
            if (!payload) {
                throw new Error("Invalid support token");
            }

            const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
            const paddedPayload = normalizedPayload + "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
            const decodedPayload = JSON.parse(window.atob(paddedPayload));
            establishSession(supportToken, {
                id: decodedPayload.sub,
                username: decodedPayload.username,
                name: decodedPayload.name,
                role: decodedPayload.role,
                tenantId: decodedPayload.tenantId,
                supportAccess: decodedPayload.supportAccess,
            });
            window.location.replace("/");
        } catch (error) {
            console.error("Failed to initialize support access:", error);
            setError("Support access link is invalid or expired.");
        }
    }, [searchParams, establishSession]);

    useEffect(() => {
        document.title = branding.requiresSetup
            ? `${branding.companyName} Setup`
            : `${branding.companyName} Login`;

        if (!branding.faviconUrl) {
            return;
        }

        let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }

        favicon.href = branding.faviconUrl;
    }, [branding]);

    const handleBootstrapAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/bootstrap-admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.access_token, data.user);
            } else {
                setError(data.message || "Failed to create the first admin account");
            }
        } catch {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Check if 2FA is required
                if (data.requires2FA) {
                    setRequires2FA(true);
                    setError(null);
                } else {
                    login(data.access_token, data.user);
                }
            } else {
                setError(data.message || "Invalid username or password");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/2fa/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, token: twoFactorCode }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.access_token, data.user);
            } else {
                setError(data.message || "Invalid 2FA code");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{
                backgroundColor: "#f8fafc",
            }}
        >
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/95 backdrop-blur p-3 rounded-2xl shadow-lg border border-white/70 flex items-center gap-3">
                            <div
                                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-transparent"
                            >
                                {branding.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={branding.logoUrl}
                                        alt={`${branding.companyName} logo`}
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <Building2 className="text-slate-700 h-6 w-6" />
                                )}
                            </div>
                            <div className="text-left">
                                <span className="text-xl font-bold tracking-tight text-slate-800 block">
                                    {branding.companyName}
                                </span>
                                <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                                    Client Portal
                                </span>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        {branding.requiresSetup ? "Set Up Your Portal" : branding.loginTitle}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {branding.requiresSetup
                            ? `Create the first administrator for ${branding.companyName}.`
                            : branding.loginSubtitle}
                    </p>
                </div>

                <Card className="border-white/50 bg-white/95 backdrop-blur shadow-2xl shadow-slate-900/20">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {branding.requiresSetup ? "First Admin Setup" : "Staff Login"}
                        </CardTitle>
                        <CardDescription>
                            {branding.requiresSetup
                                ? "This tenant has no users yet. Create the admin account that will manage users and credentials."
                                : "Enter your credentials to access the dashboard"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {branding.requiresSetup ? (
                            <form onSubmit={handleBootstrapAdmin} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive" className="py-2 text-xs">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Administrator Name</label>
                                    <Input
                                        placeholder="Enter full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            placeholder="Choose admin username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="password"
                                            className="pl-10"
                                            placeholder="Create a strong password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Use at least 8 characters with uppercase, lowercase, number, and special character.
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-11 text-sm font-semibold"
                                    style={{ backgroundColor: branding.primaryColor }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        "Create Admin Account"
                                    )}
                                </Button>
                            </form>
                        ) : !requires2FA ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive" className="py-2 text-xs">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            placeholder="Enter username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="password"
                                            className="pl-10"
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-11 text-sm font-semibold"
                                    style={{ backgroundColor: branding.primaryColor }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerify2FA} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive" className="py-2 text-xs">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Two-Factor Code</label>
                                    <p className="text-xs text-slate-500">Enter the 6-digit code from your authenticator app</p>
                                    <Input
                                        type="text"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                        className="text-center text-2xl tracking-widest"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setRequires2FA(false);
                                            setTwoFactorCode('');
                                            setError(null);
                                        }}
                                        className="flex-1"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        style={{ backgroundColor: branding.primaryColor }}
                                        disabled={loading || twoFactorCode.length !== 6}
                                    >
                                        {loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            "Verify"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} {branding.companyName}. Powered by PharmaFlow Pro.
                </p>
            </div>
        </div>
    );
}
