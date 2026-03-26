"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Diagnostics = {
    currentUrl: string;
    origin: string;
    hostname: string;
    tenantLabel: string;
    userAgent: string;
    online: boolean;
    secureContext: boolean;
    standaloneMode: boolean;
    serviceWorkerSupported: boolean;
    serviceWorkerController: boolean;
    serviceWorkerScope: string | null;
    serviceWorkerActiveState: string | null;
    serviceWorkerWaitingState: string | null;
    manifestHref: string | null;
    manifestName: string | null;
    manifestStartUrl: string | null;
    manifestDisplay: string | null;
    manifestScope: string | null;
    manifestId: string | null;
    manifestIconCount: number | null;
    installConfirmed: string | null;
    installPromptSeenAt: string | null;
    installPromptOutcome: string | null;
    appInstalledAt: string | null;
    swRegisteredAt: string | null;
    swControllerChangeAt: string | null;
    swWaitingAt: string | null;
    dismissedAt: string | null;
};

function getTenantLabel(hostname: string) {
    const parts = hostname.split(".");
    if (parts.length >= 4) {
        return parts[0];
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "local";
    }

    return "platform";
}

function formatDelay(from: string | null, to: string | null) {
    if (!from || !to) {
        return null;
    }

    const start = new Date(from).getTime();
    const endTimestamp = to.includes(":") ? to.split(":").slice(1).join(":") : to;
    const end = new Date(endTimestamp).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
        return null;
    }

    return ((end - start) / 1000).toFixed(1);
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            <span className="break-all text-sm text-slate-900">{value}</span>
        </div>
    );
}

export default function PWADebugPage() {
    const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        void collectDiagnostics();
    }, []);

    const collectDiagnostics = async () => {
        const hostname = window.location.hostname;
        const tenantLabel = getTenantLabel(hostname);
        const manifestHref = document.querySelector("link[rel='manifest']")?.getAttribute("href") || "/manifest.json";

        let manifestName: string | null = null;
        let manifestStartUrl: string | null = null;
        let manifestDisplay: string | null = null;
        let manifestScope: string | null = null;
        let manifestId: string | null = null;
        let manifestIconCount: number | null = null;

        try {
            const manifestResponse = await fetch(manifestHref, { cache: "no-store" });
            if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                manifestName = manifest.name ?? null;
                manifestStartUrl = manifest.start_url ?? null;
                manifestDisplay = manifest.display ?? null;
                manifestScope = manifest.scope ?? null;
                manifestId = manifest.id ?? null;
                manifestIconCount = Array.isArray(manifest.icons) ? manifest.icons.length : 0;
            }
        } catch {
            manifestName = null;
        }

        let serviceWorkerScope: string | null = null;
        let serviceWorkerActiveState: string | null = null;
        let serviceWorkerWaitingState: string | null = null;

        if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            serviceWorkerScope = registration?.scope ?? null;
            serviceWorkerActiveState = registration?.active?.state ?? null;
            serviceWorkerWaitingState = registration?.waiting?.state ?? null;
        }

        setDiagnostics({
            currentUrl: window.location.href,
            origin: window.location.origin,
            hostname,
            tenantLabel,
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            secureContext: window.isSecureContext,
            standaloneMode:
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
            serviceWorkerSupported: "serviceWorker" in navigator,
            serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
            serviceWorkerScope,
            serviceWorkerActiveState,
            serviceWorkerWaitingState,
            manifestHref,
            manifestName,
            manifestStartUrl,
            manifestDisplay,
            manifestScope,
            manifestId,
            manifestIconCount,
            installConfirmed: localStorage.getItem("pwa-appinstalled-at") ? "true" : null,
            installPromptSeenAt: localStorage.getItem("pwa-beforeinstallprompt-seen-at"),
            installPromptOutcome: localStorage.getItem("pwa-install-outcome"),
            appInstalledAt: localStorage.getItem("pwa-appinstalled-at"),
            swRegisteredAt: localStorage.getItem("pwa-sw-registered-at"),
            swControllerChangeAt: localStorage.getItem("pwa-sw-controller-change-at"),
            swWaitingAt: localStorage.getItem("pwa-sw-waiting-at"),
            dismissedAt: localStorage.getItem("pwa-dismissed-at"),
        });
    };

    const handleCopy = async () => {
        if (!diagnostics) {
            return;
        }

        await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const handleReset = async () => {
        [
            "pwa-installed",
            "pwa-beforeinstallprompt-seen-at",
            "pwa-install-outcome",
            "pwa-appinstalled-at",
            "pwa-sw-registered-at",
            "pwa-sw-scope",
            "pwa-sw-controller-change-at",
            "pwa-sw-waiting-at",
            "pwa-dismissed-at",
        ].forEach((key) => localStorage.removeItem(key));

        await collectDiagnostics();
    };

    const promptToOutcomeDelay = diagnostics
        ? formatDelay(diagnostics.installPromptSeenAt, diagnostics.installPromptOutcome)
        : null;
    const promptToInstalledDelay = diagnostics
        ? formatDelay(diagnostics.installPromptSeenAt, diagnostics.appInstalledAt)
        : null;
    const outcomeTimestamp = diagnostics?.installPromptOutcome
        ? diagnostics.installPromptOutcome.split(":").slice(1).join(":")
        : null;
    const outcomeToInstalledDelay = diagnostics
        ? formatDelay(outcomeTimestamp, diagnostics.appInstalledAt)
        : null;
    const installAvailability = diagnostics?.installPromptSeenAt
        ? "Real install prompt available"
        : "Waiting for Chrome install prompt";
    const installAvailabilityTone = diagnostics?.installPromptSeenAt
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">PWA Diagnostics</h1>
                    <p className="text-sm text-slate-500">
                        Open this page on your Android device after trying install. It shows what the browser is actually seeing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void collectDiagnostics()}>Refresh</Button>
                    <Button variant="outline" onClick={() => void handleCopy()}>{copied ? "Copied" : "Copy JSON"}</Button>
                    <Button variant="outline" onClick={() => void handleReset()}>Reset Logs</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Status Summary</CardTitle>
                    <CardDescription>
                        The most important signals are `secureContext`, `serviceWorkerController`, `manifestStartUrl`, and `installPromptSeenAt`.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div className={`rounded-lg border p-3 ${installAvailabilityTone}`}>
                        <span className="text-xs font-semibold uppercase tracking-wide">Install Status</span>
                        <p className="mt-1 text-sm font-medium">{installAvailability}</p>
                    </div>
                    <Row label="Tenant Label" value={diagnostics?.tenantLabel ?? "Loading..."} />
                    <Row label="Hostname" value={diagnostics?.hostname ?? "Loading..."} />
                    <Row label="Secure Context" value={diagnostics ? String(diagnostics.secureContext) : "Loading..."} />
                    <Row label="Standalone Mode" value={diagnostics ? String(diagnostics.standaloneMode) : "Loading..."} />
                    <Row label="SW Supported" value={diagnostics ? String(diagnostics.serviceWorkerSupported) : "Loading..."} />
                    <Row label="SW Controller" value={diagnostics ? String(diagnostics.serviceWorkerController) : "Loading..."} />
                    <Row label="SW Scope" value={diagnostics?.serviceWorkerScope ?? "Loading..."} />
                    <Row label="SW Active State" value={diagnostics?.serviceWorkerActiveState ?? "Loading..."} />
                    <Row label="Manifest Start URL" value={diagnostics?.manifestStartUrl ?? "Loading..."} />
                    <Row label="Manifest Display" value={diagnostics?.manifestDisplay ?? "Loading..."} />
                    <Row label="Install Prompt Seen" value={diagnostics?.installPromptSeenAt ?? "Not seen"} />
                    <Row label="Install Outcome" value={diagnostics?.installPromptOutcome ?? "No prompt result"} />
                    <Row label="App Installed At" value={diagnostics?.appInstalledAt ?? "Not installed"} />
                    <Row label="Dismissed At" value={diagnostics?.dismissedAt ?? "Never dismissed"} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Install Timing</CardTitle>
                    <CardDescription>
                        This helps verify how long Chrome takes between showing the install prompt and finishing the app install.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                        <p className="text-sm text-slate-600">
                            If `Prompt to Installed` is much longer than `Prompt to Outcome`, the browser accepted the install quickly but Android took longer to finish creating the app entry.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Row label="Prompt to Outcome" value={promptToOutcomeDelay ? `${promptToOutcomeDelay}s` : "Not available"} />
                        <Row label="Prompt to Installed" value={promptToInstalledDelay ? `${promptToInstalledDelay}s` : "Not available"} />
                        <Row label="Outcome to Installed" value={outcomeToInstalledDelay ? `${outcomeToInstalledDelay}s` : "Not available"} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Raw Details</CardTitle>
                    <CardDescription>Copy this JSON and send it back if you want me to inspect the exact installability state.</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                        {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}
