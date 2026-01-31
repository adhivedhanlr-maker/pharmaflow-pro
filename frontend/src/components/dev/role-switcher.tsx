"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserCog, Shield, Package, TrendingUp, Calculator, Users } from "lucide-react";

const ROLES = [
    { value: "ADMIN", label: "Admin", icon: Shield, color: "bg-red-500" },
    { value: "BILLING_OPERATOR", label: "Billing Operator", icon: Calculator, color: "bg-blue-500" },
    { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager", icon: Package, color: "bg-green-500" },
    { value: "SALES_REP", label: "Sales Rep", icon: TrendingUp, color: "bg-purple-500" },
    { value: "ACCOUNTANT", label: "Accountant", icon: Users, color: "bg-orange-500" },
];

export function RoleSwitcher() {
    const { user, switchRole, testMode } = useAuth();

    // Only show in development mode
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    const currentRole = ROLES.find(r => r.value === user?.role);
    const Icon = currentRole?.icon || UserCog;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="shadow-lg border-2 hover:scale-105 transition-transform"
                        size="lg"
                    >
                        <Icon className="mr-2 h-4 w-4" />
                        {testMode && (
                            <Badge variant="secondary" className="mr-2">
                                TEST
                            </Badge>
                        )}
                        {currentRole?.label || "Switch Role"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Development Role Switcher</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ROLES.map((role) => {
                        const RoleIcon = role.icon;
                        const isActive = user?.role === role.value;
                        return (
                            <DropdownMenuItem
                                key={role.value}
                                onClick={() => switchRole(role.value)}
                                className={isActive ? "bg-accent" : ""}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div className={`w-2 h-2 rounded-full ${role.color}`} />
                                    <RoleIcon className="h-4 w-4" />
                                    <span className="flex-1">{role.label}</span>
                                    {isActive && (
                                        <Badge variant="default" className="text-xs">
                                            Active
                                        </Badge>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
