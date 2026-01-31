"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/context/auth-context";
import { Menu, LogOut, User } from "lucide-react";
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
import { useState } from "react";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    // Enable session timeout tracking
    useSessionTimeout();

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
        <div className="flex h-screen overflow-hidden bg-slate-50 print:overflow-visible print:h-auto">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex no-print" />

            <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible print:h-auto">
                {/* Mobile Header with Hamburger */}
                <div className="md:hidden flex items-center p-4 bg-white border-b sticky top-0 z-40 no-print">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-2">
                                <Menu className="h-6 w-6 text-slate-600" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-80">
                            <Sidebar className="w-full h-full border-none" onNavigate={() => setIsMobileMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex-1">
                        PharmaFlow
                    </span>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 shadow-xl border-slate-200" align="end">
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

                {/* Desktop Header / Content Container */}
                <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
                    <div className="hidden md:block no-print">
                        <Header />
                    </div>

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 print:overflow-visible print:h-auto print:p-0">
                        {children}
                    </main>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="no-print">
                    <MobileNav />
                </div>
            </div>
        </div>
    );
}
