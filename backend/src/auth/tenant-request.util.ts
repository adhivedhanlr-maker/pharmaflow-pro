export function resolveTenantHostFromRequest(req: any): string | undefined {
    const explicitHost = req.headers['x-tenant-host'];
    if (typeof explicitHost === 'string' && explicitHost.length > 0) {
        return extractHost(explicitHost);
    }

    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
        return extractHost(origin);
    }

    const referer = req.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
        return extractHost(referer);
    }

    const host = req.headers.host;
    if (typeof host === 'string' && host.length > 0) {
        return extractHost(host);
    }

    return undefined;
}

function extractHost(value: string): string {
    try {
        if (value.startsWith('http://') || value.startsWith('https://')) {
            return new URL(value).host;
        }
    } catch {
        // Fall back to the raw host parsing below.
    }

    return value.replace(/^https?:\/\//, '').split('/')[0];
}
