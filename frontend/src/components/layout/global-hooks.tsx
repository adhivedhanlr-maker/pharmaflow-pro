"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGPSSync } from "@/hooks/use-gps-sync";
import { usePWARegistration } from "@/hooks/use-pwa-registration";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function useTenantTitle() {
    const pathname = usePathname();

    useEffect(() => {
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        const isplatform = ['pharmaflow', 'localhost', '127'].includes(subdomain);
        if (!isplatform && subdomain) {
            const name = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
            document.title = `${name} PharmaFlow Pro`;
        }
    }, [pathname]);
}

export function GlobalHooks() {
    usePWARegistration();
    useGPSSync();
    usePushNotifications();
    useTenantTitle();
    return null;
}
