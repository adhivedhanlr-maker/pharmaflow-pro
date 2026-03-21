import { Role } from '@prisma/client';

export function isAdminLikeRole(role?: string | null) {
    return role === Role.ADMIN || role === 'DEVELOPER';
}

export function hasRequiredRole(userRole: string | null | undefined, requiredRoles: Role[]) {
    if (!userRole) {
        return false;
    }

    if (requiredRoles.includes(userRole as Role)) {
        return true;
    }

    return userRole === 'DEVELOPER' && requiredRoles.includes(Role.ADMIN);
}
