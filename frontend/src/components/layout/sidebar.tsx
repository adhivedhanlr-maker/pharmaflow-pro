"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Receipt, label: "Billing", href: "/billing" },
  { icon: ShoppingCart, label: "Purchases", href: "/purchases" },
  { icon: Package, label: "Stock", href: "/stock" },
  { icon: Users, label: "Parties", href: "/parties" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: RefreshCcw, label: "Returns", href: "/returns" },
  { icon: UserCog, label: "User Management", href: "/users" },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col h-screen border-r bg-card shadow-sm transition-all duration-300",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      <div className="p-6 flex items-center gap-3 border-b relative">
        {!isCollapsed && (
          <>
            <Image
              src="/pharmaflow-logo.png"
              alt="PharmaFlow Pro"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                PharmaFlow
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium">Pro Edition</p>
            </div>
          </>
        )}
        {isCollapsed && (
          <Image
            src="/pharmaflow-logo.png"
            alt="PharmaFlow Pro"
            width={32}
            height={32}
            className="rounded-lg mx-auto"
          />
        )}

        {/* Only show collapse button on desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-blue-600 text-white md:flex hidden items-center justify-center shadow-lg hover:bg-blue-700 transition-all border-2 border-white z-50"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary", isCollapsed && "h-5 w-5")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className={cn("h-4 w-4 shrink-0", isCollapsed && "h-5 w-5")} />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </div>
    </div>
  );
}
