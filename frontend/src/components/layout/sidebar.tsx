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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCog,
  MapPin,
  Navigation,
  LogOut,
  Map as MapIcon,
  Clock,
  FileSpreadsheet,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useShortcut } from "@/context/shortcut-context";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ["ADMIN", "BILLING_OPERATOR", "WAREHOUSE_MANAGER", "ACCOUNTANT", "SALES_REP"], hint: "D" },
  { icon: Receipt, label: "Billing", href: "/billing", roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT"], hint: "B" },
  { icon: ShoppingCart, label: "Take Order", href: "/rep/orders/create", roles: ["SALES_REP"], hint: "O" },
  { icon: ShoppingCart, label: "Purchases", href: "/purchases", roles: ["ADMIN", "WAREHOUSE_MANAGER", "ACCOUNTANT"], hint: "P" },
  { icon: Package, label: "Stock", href: "/stock", roles: ["ADMIN", "WAREHOUSE_MANAGER"], hint: "S" },
  { icon: Users, label: "Parties", href: "/parties", roles: ["ADMIN", "BILLING_OPERATOR", "ACCOUNTANT", "SALES_REP"], hint: "C" },
  { icon: BarChart3, label: "Reports", href: "/reports", roles: ["ADMIN", "ACCOUNTANT"], hint: "E" },
  { icon: ShoppingCart, label: "Orders", href: "/orders", roles: ["ADMIN", "BILLING_OPERATOR"], hint: "O" },
  { icon: Package, label: "Deliveries", href: "/deliveries", roles: ["ADMIN", "BILLING_OPERATOR", "SALES_REP"], hint: "L" },
  { icon: MapPin, label: "Visits", href: "/visits", roles: ["ADMIN", "SALES_REP"], hint: "V" },
  { icon: Calendar, label: "Route Planner", href: "/admin/routes", roles: ["ADMIN"], hint: "R" },
  { icon: Navigation, label: "Live Tracking", href: "/visits/tracking", roles: ["ADMIN"] },
  { icon: MapIcon, label: "Route History", href: "/visits/history", roles: ["ADMIN", "SALES_REP"] },
  { icon: Clock, label: "My Day", href: "/visits/my-day", roles: ["SALES_REP"], hint: "D" },
  { icon: FileSpreadsheet, label: "Attendance", href: "/attendance", roles: ["ADMIN"], hint: "A" },
  { icon: RefreshCw, label: "Returns", href: "/returns", roles: ["ADMIN", "BILLING_OPERATOR", "WAREHOUSE_MANAGER"], hint: "R" },
  { icon: UserCog, label: "User Management", href: "/users", roles: ["ADMIN"], hint: "U" },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { showHints } = useShortcut();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredMenuItems = menuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className={cn(
      "flex flex-col h-screen border-r bg-card shadow-sm transition-all duration-300 z-50 relative", // Added z-50 and relative
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
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative group",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary", isCollapsed && "h-5 w-5")} />
              {!isCollapsed && <span>{item.label}</span>}

              {showHints && item.hint && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-200">
                  <Badge variant="outline" className="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center text-[10px] font-bold bg-slate-900 text-white border-slate-700 shadow-sm pointer-events-none">
                    {item.hint}
                  </Badge>
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      {user?.role === "ADMIN" && (
        <div className="px-4 py-2 border-t">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative group",
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
      )}

    </div>
  );
}
