"use client";

import { useAuth } from "@/context/auth-context";
import { ReactNode } from "react";

interface RoleGateProps {
    children: ReactNode;
    allowedRoles: string[];
    fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
