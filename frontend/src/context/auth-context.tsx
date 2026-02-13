"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    isOnDuty?: boolean;
    twoFactorEnabled?: boolean;
    canGenerateInvoice?: boolean;
    lastLat?: number;
    lastLng?: number;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [testMode, setTestMode] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const isAuthenticated = !!token || testMode;

    useEffect(() => {
        // Check for existing session on mount
        const storedToken = localStorage.getItem("auth_token");
        const storedUser = localStorage.getItem("auth_user");
        const isTestMode = localStorage.getItem("test_mode") === "true";
        const testUser = localStorage.getItem("test_user");
        const testToken = localStorage.getItem("test_token");

        if (isTestMode && testUser && testToken) {
            setTestMode(true);
            setUser(JSON.parse(testUser));
            setToken(testToken);
        } else if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        // Sync with Neon Auth
        // Note: Actual Neon Auth extraction might differ based on SDK version
        // Assuming we can get the token if accessible.
        // For now, relying on the provider to handle the UI flow, 
        // and we might need to manually set the token after login in a callback if Neon doesn't auto-sync.

        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        // Legacy login (if used)
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem("auth_token", newToken);
        localStorage.setItem("auth_user", JSON.stringify(newUser));
        document.cookie = `auth_token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
        router.push("/");
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
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("test_mode");
        localStorage.removeItem("test_user");
        localStorage.removeItem("test_token");
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        // Neon Logout
        // auth.logout(); // If available in the client
        router.push("/login");
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem("auth_user", JSON.stringify(userData));
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAuthenticated, testMode, switchRole, refreshUser }}>
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
