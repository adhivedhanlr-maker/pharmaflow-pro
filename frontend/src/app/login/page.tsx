"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleQuickLogin = async (roleUsername: string) => {
        setUsername(roleUsername);
        setPassword("Admin@123");
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: roleUsername, password: "Admin@123" }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.access_token, data.user);
            } else {
                setError(data.message || "Quick login failed");
            }
        } catch (err) {
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className="bg-primary p-2 rounded-lg">
                                <Lock className="text-white h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-800">
                                PharmaFlow <span className="text-primary">Pro</span>
                            </span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500 text-sm">Sign in to manage your pharmaceutical distribution</p>
                </div>

                <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Staff Login</CardTitle>
                        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!requires2FA ? (
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
                                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
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
                                    <Button type="submit" className="flex-1" disabled={loading || twoFactorCode.length !== 6}>
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

                <div className="pt-4">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-50 px-2 text-slate-400 font-medium tracking-widest">Developer Quick Access</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-8">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-9 bg-white hover:bg-slate-50 border-slate-200"
                            onClick={() => handleQuickLogin('admin')}
                            disabled={loading}
                        >
                            Admin
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-9 bg-white hover:bg-slate-50 border-slate-200"
                            onClick={() => handleQuickLogin('billing1')}
                            disabled={loading}
                        >
                            Billing
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-9 bg-white hover:bg-slate-50 border-slate-200"
                            onClick={() => handleQuickLogin('warehouse1')}
                            disabled={loading}
                        >
                            Warehouse
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-9 bg-white hover:bg-slate-50 border-slate-200"
                            onClick={() => handleQuickLogin('accountant1')}
                            disabled={loading}
                        >
                            Accountant
                        </Button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} PharmaFlow Pro Systems. All rights reserved.
                </p>
            </div>
        </div>
    );
}
