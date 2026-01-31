"use client";

import { useGPSSync } from "@/hooks/use-gps-sync";

export function GlobalHooks() {
    useGPSSync();
    return null;
}
