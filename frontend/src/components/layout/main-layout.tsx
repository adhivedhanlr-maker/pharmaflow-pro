"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/context/auth-context";

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, isLoading } = useAuth();

    const isLoginPage = pathname === "/login";

    // While checking for existing session, show a clean state
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="animate-pulse text-slate-400 font-semibold text-lg">PharmaFlow...</div>
            </div>
        );
    }

    // Login page should not have sidebar or header
    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {children}
                </main>
            </div>
        </div>
    );
}
