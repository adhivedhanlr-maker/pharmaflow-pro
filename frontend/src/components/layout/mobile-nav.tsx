"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
    LayoutDashboard,
    Receipt,
    Package,
    Settings,
    ClipboardList,
    LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    const items = useMemo(() => {
        const defaultItems = [
            {
                title: "Home",
                href: "/",
                icon: LayoutDashboard,
            },
            {
                title: "Billing",
                href: "/billing",
                icon: Receipt,
            },
            {
                title: "Stock",
                href: "/stock",
                icon: Package,
            },
            {
                title: "Settings",
                href: "/settings",
                icon: Settings,
            },
        ];

        if (user?.role === "SALES_REP") {
            return [
                {
                    title: "Home",
                    href: "/",
                    icon: LayoutDashboard,
                },
                {
                    title: "Billing",
                    href: "/billing",
                    icon: Receipt,
                },
                {
                    title: "Orders",
                    href: "/orders",
                    icon: ClipboardList,
                },
                {
                    title: "Login",
                    href: "/login",
                    icon: LogIn,
                },
            ];
        }

        return defaultItems;
    }, [user?.role]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 py-2 md:hidden">
            <div className="flex justify-between items-center">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 min-w-[60px]",
                                isActive ? "text-blue-600" : "text-slate-500"
                            )}
                        >
                            <item.icon className={cn("h-6 w-6", isActive && "fill-blue-100")} />
                            <span className="text-[10px] font-medium">{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
