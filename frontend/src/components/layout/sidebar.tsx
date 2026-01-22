import Link from "next/link";
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Receipt, label: "Billing", href: "/billing" },
  { icon: ShoppingCart, label: "Purchases", href: "/purchases" },
  { icon: Package, label: "Stock", href: "/stock" },
  { icon: Users, label: "Parties", href: "/parties" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Receipt, label: "Returns", href: "/returns" },
];

export function Sidebar() {
  return (
    <div className="flex flex-col h-screen w-64 border-r bg-muted/30">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary">PharmaFlow Pro</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
