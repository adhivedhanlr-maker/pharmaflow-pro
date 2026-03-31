"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
    LayoutDashboard, Receipt, Package, Settings,
    ClipboardList, LogIn, MapPin, PackagePlus,
    BarChart3, Users, FileText, RotateCcw, UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

type NavItem = { title: string; href: string; icon: React.ElementType };

const HOME: NavItem = { title: "Home", href: "/app", icon: LayoutDashboard };
const ACCOUNT: NavItem = { title: "Account", href: "/app/account", icon: UserCircle };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
    SALES_REP: [
        HOME,
        { title: "Visits", href: "/app/visits", icon: MapPin },
        { title: "Take Order", href: "/app/rep/orders/create", icon: ClipboardList },
        { title: "My Day", href: "/app/visits/my-day", icon: LogIn },
        ACCOUNT,
    ],
    BILLING_OPERATOR: [
        HOME,
        { title: "Billing", href: "/app/billing", icon: Receipt },
        { title: "Parties", href: "/app/parties", icon: Users },
        { title: "Returns", href: "/app/returns", icon: RotateCcw },
        ACCOUNT,
    ],
    WAREHOUSE_MANAGER: [
        HOME,
        { title: "Stock", href: "/app/stock", icon: Package },
        { title: "Purchases", href: "/app/purchases", icon: PackagePlus },
        { title: "Returns", href: "/app/returns", icon: RotateCcw },
        ACCOUNT,
    ],
    ACCOUNTANT: [
        HOME,
        { title: "Reports", href: "/app/reports", icon: BarChart3 },
        { title: "Sales", href: "/app/sales", icon: FileText },
        { title: "Parties", href: "/app/parties", icon: Users },
        ACCOUNT,
    ],
};

const DEFAULT_NAV: NavItem[] = [
    HOME,
    { title: "Billing", href: "/app/billing", icon: Receipt },
    { title: "Stock", href: "/app/stock", icon: Package },
    { title: "Settings", href: "/app/settings", icon: Settings },
    ACCOUNT,
];

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    const items = useMemo(() => {
        if (!user?.role) return DEFAULT_NAV;
        return NAV_BY_ROLE[user.role] ?? DEFAULT_NAV;
    }, [user?.role]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-2 md:hidden safe-area-bottom">
            <div className="flex justify-around items-center">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-colors",
                                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
