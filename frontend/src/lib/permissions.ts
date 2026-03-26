export const PERMISSIONS = {
    BILLING: 'billing',
    PURCHASES: 'purchases',
    STOCK: 'stock',
    REPORTS: 'reports',
    PARTIES: 'parties',
    RETURNS: 'returns',
    SALES_HISTORY: 'sales_history',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
    billing: { label: 'Create Bills / Invoices', description: 'Access the billing page and create invoices' },
    purchases: { label: 'Make Purchases', description: 'Add and manage purchase entries' },
    stock: { label: 'Manage Stock', description: 'View and manage inventory stock' },
    reports: { label: 'View Reports', description: 'Access reports and download GST statements' },
    parties: { label: 'Manage Parties', description: 'Add and edit customers and suppliers' },
    returns: { label: 'Process Returns', description: 'Handle product returns' },
    sales_history: { label: 'View Sales History', description: 'View past invoices and sales records' },
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/** Hardcoded role defaults — used as fallback if backend returns no custom config */
export const ROLE_DEFAULTS: Record<string, Permission[]> = {
    ADMIN: [...ALL_PERMISSIONS],
    DEVELOPER: [...ALL_PERMISSIONS],
    BILLING_OPERATOR: ['billing', 'parties', 'sales_history', 'returns'],
    WAREHOUSE_MANAGER: ['purchases', 'stock', 'returns'],
    ACCOUNTANT: ['reports', 'sales_history', 'parties'],
    SALES_REP: [],
};

/**
 * Returns the effective permissions for a user.
 * - If user has a non-empty `permissions` array, use those (per-user override).
 * - Otherwise fall back to the role's permissions map from the server (or hardcoded defaults).
 */
export function getEffectivePermissions(
    userPermissions: string[],
    role: string,
    rolePermissionsMap: Record<string, string[]>,
): Permission[] {
    if (userPermissions && userPermissions.length > 0) {
        return userPermissions as Permission[];
    }
    return (rolePermissionsMap[role] ?? ROLE_DEFAULTS[role] ?? []) as Permission[];
}

export function hasPermission(
    permission: Permission,
    userPermissions: string[],
    role: string,
    rolePermissionsMap: Record<string, string[]>,
): boolean {
    if (role === 'ADMIN' || role === 'DEVELOPER') return true;
    const effective = getEffectivePermissions(userPermissions, role, rolePermissionsMap);
    return effective.includes(permission);
}
