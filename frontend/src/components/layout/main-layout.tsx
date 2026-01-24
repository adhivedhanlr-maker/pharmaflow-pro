"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/context/auth-context";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, isLoading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Mobile Header with Hamburger */}
                <div className="md:hidden flex items-center p-4 bg-white border-b sticky top-0 z-40">
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
                    <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        PharmaFlow
                    </span>
                </div>

                {/* Desktop Header / Content Container */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="hidden md:block">
                        <Header />
                    </div>

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                        {children}
                    </main>
                </div>

                {/* Mobile Bottom Navigation */}
                <MobileNav />
            </div>
        </div>
    );
}
