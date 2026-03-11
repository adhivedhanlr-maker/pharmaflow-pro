"use client";

import { useGPSSync } from "@/hooks/use-gps-sync";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function GlobalHooks() {
    useGPSSync();
    usePushNotifications();
    return null;
}
