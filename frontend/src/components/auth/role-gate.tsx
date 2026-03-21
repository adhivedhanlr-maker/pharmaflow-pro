"use client";

import { useAuth } from "@/context/auth-context";
import { ReactNode } from "react";
import { hasRoleAccess } from "@/lib/roles";

interface RoleGateProps {
    children: ReactNode;
    allowedRoles: string[];
    fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
    const { user } = useAuth();

    if (!user || !hasRoleAccess(user.role, allowedRoles)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
