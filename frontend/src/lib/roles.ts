export function isAdminLikeRole(role?: string | null) {
    return role === "ADMIN" || role === "DEVELOPER";
}

export function hasRoleAccess(userRole: string | null | undefined, allowedRoles: string[]) {
    if (!userRole) {
        return false;
    }

    if (allowedRoles.includes(userRole)) {
        return true;
    }

    return userRole === "DEVELOPER" && allowedRoles.includes("ADMIN");
}
