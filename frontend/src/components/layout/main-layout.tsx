"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/context/auth-context";
import { Menu, LogOut, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ShellBranding = {
    companyName?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
};

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout, isLoading, user, exitSupportAccess } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [branding, setBranding] = useState<ShellBranding | null>(null);

    useSessionTimeout();

    const isLoginPage = pathname === "/login";

    useEffect(() => {
        const loadBranding = async () => {
            try {
                const response = await fetch(`${API_BASE}/public/tenant-branding?host=${window.location.host}`);
                if (!response.ok) return;

                const data = await response.json();
                setBranding(data);

                if (data?.companyName) {
                    document.title = `${data.companyName} | PharmaFlow Pro`;
                } else {
                    document.title = "PharmaFlow Pro";
                }

                const faviconUrl = data?.faviconUrl || data?.logoUrl;
                if (faviconUrl) {
                    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
                    if (!link) {
                        link = document.createElement("link");
                        link.rel = "icon";
                        document.head.appendChild(link);
                    }
                    link.href = faviconUrl;
                } else {
                    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
                    if (!link) {
                        link = document.createElement("link");
                        link.rel = "icon";
                        document.head.appendChild(link);
                    }
                    link.href = "/logo.png";
                }
            } catch (error) {
                console.error("Failed to load tenant branding:", error);
            }
        };

        void loadBranding();
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="animate-pulse text-slate-400 font-semibold text-lg">
                    {branding?.companyName || "PharmaFlow..."}
                </div>
            </div>
        );
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 print:overflow-visible print:h-auto">
            <Sidebar className="hidden md:flex no-print" branding={branding} />

            <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible print:h-auto">
                <div className="md:hidden flex items-center p-4 bg-white border-b sticky top-0 z-40 no-print">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-2">
                                <Menu className="h-6 w-6 text-slate-600" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-80">
                            <Sidebar className="w-full h-full border-none" onNavigate={() => setIsMobileMenuOpen(false)} branding={branding} />
                        </SheetContent>
                    </Sheet>
                    <span className="font-bold text-lg text-slate-900 flex-1">
                        {branding?.companyName || "PharmaFlow"}
                    </span>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 shadow-xl border-slate-200" align="end">
                                {user?.supportAccess?.active && (
                                    <button
                                        onClick={() => void exitSupportAccess()}
                                        className="w-full flex items-center gap-2 p-2 text-sm text-amber-700 hover:bg-amber-50 rounded-md transition-colors font-medium"
                                    >
                                        <ShieldAlert className="h-4 w-4" />
                                        Exit Support Access
                                    </button>
                                )}
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
                    {user?.supportAccess?.active && (
                        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 text-amber-950 no-print">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-start gap-2">
                                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold">
                                            Support Access Active: {user.supportAccess.actorName} is working inside {user.supportAccess.targetTenantName}
                                        </p>
                                        <p className="text-xs text-amber-800">
                                            Reason: {user.supportAccess.reason} | Started: {new Date(user.supportAccess.startedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-300 bg-white hover:bg-amber-50"
                                    onClick={() => void exitSupportAccess()}
                                >
                                    Exit Support Access
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="hidden md:block no-print">
                        <Header branding={branding} />
                    </div>

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 print:overflow-visible print:h-auto print:p-0">
                        {children}
                    </main>
                </div>

                <div className="no-print">
                    <MobileNav />
                </div>
            </div>
        </div>
    );
}
