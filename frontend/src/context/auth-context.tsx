"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    tenantId?: string | null;
    isOnDuty?: boolean;
    twoFactorEnabled?: boolean;
    canGenerateInvoice?: boolean;
    permissions?: string[];
    lastLat?: number;
    lastLng?: number;
    supportAccess?: {
        active: boolean;
        sessionId: string;
        actorUserId: string;
        actorName: string;
        actorRole: string;
        actorTenantId?: string | null;
        targetTenantId: string;
        targetTenantName: string;
        targetTenantSlug: string;
        targetTenantDomain: string;
        reason: string;
        startedAt: string;
        returnUrl: string;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
    isAuthenticated: boolean;
    testMode: boolean;
    switchRole: (role: string) => void;
    refreshUser: () => Promise<void>;
    establishSession: (token: string, user: User) => void;
    exitSupportAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [testMode, setTestMode] = useState(false);
    const router = useRouter();

    const isAuthenticated = !!token || testMode;

    const clearStoredSession = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };

    const isValidSessionUser = (value: unknown): value is User => {
        if (!value || typeof value !== "object") {
            return false;
        }

        const candidate = value as Partial<User>;
        return Boolean(
            typeof candidate.id === "string" &&
            candidate.id.trim() &&
            typeof candidate.username === "string" &&
            candidate.username.trim() &&
            typeof candidate.role === "string" &&
            candidate.role.trim() &&
            typeof candidate.name === "string" &&
            candidate.name.trim()
        );
    };

    const parseStoredUser = (rawUser: string | null) => {
        if (!rawUser) {
            return null;
        }

        try {
            const parsed = JSON.parse(rawUser);
            return isValidSessionUser(parsed) ? parsed : null;
        } catch (error) {
            console.error("Failed to parse stored auth user:", error);
            return null;
        }
    };

    const restoreSessionFromServer = async (sessionToken: string) => {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        try {
            const response = await fetch(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${sessionToken}` },
                signal: controller.signal,
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token genuinely expired or revoked — must log out
                    setToken(null);
                    setUser(null);
                    clearStoredSession();
                    if (typeof window !== "undefined" && !window.location.pathname.endsWith("/app/login")) {
                        router.push("/app/login");
                    }
                }
                // Any other status (500, 503 etc.) — backend hiccup, keep cached session
                return;
            }

            const userData = await response.json();
            if (!isValidSessionUser(userData)) {
                return; // Unexpected payload shape — keep cached session, don't log out
            }

            setToken(sessionToken);
            setUser(userData);
            localStorage.setItem("auth_token", sessionToken);
            localStorage.setItem("auth_user", JSON.stringify(userData));
            document.cookie = `auth_token=${sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
        } catch (error) {
            // Network error or timeout — backend unreachable, keep the cached session
            // Only a confirmed 401/403 above triggers logout
            const isAbort = error instanceof DOMException && error.name === "AbortError";
            console.warn(isAbort ? "Session validation timed out — keeping cached session" : "Session validation network error — keeping cached session");
        } finally {
            clearTimeout(timeout);
        }
    };

    useEffect(() => {
        const bootstrapSession = async () => {
            const storedToken = localStorage.getItem("auth_token");
            const storedUser = parseStoredUser(localStorage.getItem("auth_user"));
            const isTestMode = localStorage.getItem("test_mode") === "true";
            const testUser = parseStoredUser(localStorage.getItem("test_user"));
            const testToken = localStorage.getItem("test_token");

            if (isTestMode && testUser && testToken) {
                setTestMode(true);
                setUser(testUser);
                setToken(testToken);
                setIsLoading(false);
                return;
            }

            if (!storedToken) {
                setIsLoading(false);
                return;
            }

            if (storedUser) {
                setToken(storedToken);
                setUser(storedUser);
                setIsLoading(false);
                // Validate token in background; will redirect to login if expired
                void restoreSessionFromServer(storedToken);
                return;
            }

            try {
                await restoreSessionFromServer(storedToken);
            } finally {
                setIsLoading(false);
            }
        };

        void bootstrapSession();
    }, []);

    const login = (newToken: string, newUser: User) => {
        // Legacy login (if used)
        establishSession(newToken, newUser);
        router.push("/app");
    };

    const establishSession = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem("auth_token", newToken);
        localStorage.setItem("auth_user", JSON.stringify(newUser));
        document.cookie = `auth_token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
    };

    const switchRole = (role: string) => {
        // Only allow in development mode
        if (process.env.NODE_ENV !== 'production') {
            const testUser: User = {
                id: `test-${role.toLowerCase()}`,
                username: `test_${role.toLowerCase()}`,
                name: `Test ${role}`,
                role: role,
            };
            setUser(testUser);
            setTestMode(true);

            // Create a mock token for test mode (base64 encoded test user info)
            const mockToken = `test_${btoa(JSON.stringify(testUser))}`;
            setToken(mockToken);

            localStorage.setItem("test_mode", "true");
            localStorage.setItem("test_user", JSON.stringify(testUser));
            localStorage.setItem("test_token", mockToken);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setTestMode(false);
        clearStoredSession();
        localStorage.removeItem("test_mode");
        localStorage.removeItem("test_user");
        localStorage.removeItem("test_token");
        // Neon Logout
        // auth.logout(); // If available in the client
        router.push("/app/login");
    };

    const refreshUser = async () => {
        if (!token) return;
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const response = await fetch(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            if (response.ok) {
                const userData = await response.json();
                if (!isValidSessionUser(userData)) {
                    throw new Error("Refreshed user payload is incomplete");
                }
                setUser(userData);
                localStorage.setItem("auth_user", JSON.stringify(userData));
            } else if (response.status === 401) {
                // Token expired — clear session and redirect
                setToken(null);
                setUser(null);
                clearStoredSession();
                router.push("/app/login");
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        } finally {
            clearTimeout(timeout);
        }
    };

    const exitSupportAccess = async () => {
        if (!user?.supportAccess?.active) {
            return;
        }

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            await fetch(`${API_BASE}/tenant-branding/admin/support-access/exit`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (error) {
            console.error("Failed to log support access exit:", error);
        } finally {
            setToken(null);
            setUser(null);
            clearStoredSession();
            window.location.href = user.supportAccess.returnUrl;
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAuthenticated, testMode, switchRole, refreshUser, establishSession, exitSupportAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
