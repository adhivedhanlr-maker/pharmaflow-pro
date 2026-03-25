"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, MoreVertical } from "lucide-react";

type InstallMode = "android-prompt" | "android-manual" | "ios" | "hidden";

export function PWAInstallPrompt() {
    const [mode, setMode] = useState<InstallMode>("hidden");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Already installed as PWA — don't show
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        if (isStandalone) return;

        // Don't show if dismissed in the last 3 days
        const dismissedAt = localStorage.getItem("pwa-dismissed-at");
        if (dismissedAt && Date.now() - parseInt(dismissedAt) < 3 * 24 * 60 * 60 * 1000) return;

        const ua = window.navigator.userAgent;
        const isIos = /iphone|ipad|ipod/i.test(ua);
        const isAndroid = /android/i.test(ua);
        const isMobile = isIos || isAndroid;

        if (!isMobile) return; // Desktop doesn't need the banner

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setMode("android-prompt");
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Show manual instructions if no prompt after 2s
        // This covers browsers that don't fire beforeinstallprompt
        const fallback = setTimeout(() => {
            if (isIos) {
                setMode("ios");
            } else if (isAndroid) {
                setMode("android-manual");
            }
        }, 2000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            clearTimeout(fallback);
        };
    }, []);

    // Once beforeinstallprompt fires, cancel the fallback timer effect
    useEffect(() => {
        if (deferredPrompt) setMode("android-prompt");
    }, [deferredPrompt]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setMode("hidden");
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setMode("hidden");
        setDismissed(true);
        localStorage.setItem("pwa-dismissed-at", Date.now().toString());
    };

    if (mode === "hidden" || dismissed) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
            <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4 text-slate-500" />
            </button>

            <div className="flex items-start gap-3 pr-6">
                <img
                    src="/icon-192x192.png"
                    alt="PharmaFlow Pro"
                    className="w-12 h-12 rounded-xl flex-shrink-0"
                />
                <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">Install PharmaFlow Pro</p>

                    {mode === "android-prompt" && (
                        <>
                            <p className="text-xs text-slate-500 mt-0.5 mb-3">
                                Get the app for faster access and offline use.
                            </p>
                            <Button onClick={handleInstall} size="sm" className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Install App
                            </Button>
                        </>
                    )}

                    {mode === "android-manual" && (
                        <>
                            <p className="text-xs text-slate-500 mt-0.5 mb-2">
                                Install this app on your phone:
                            </p>
                            <ol className="text-xs text-slate-700 space-y-1 list-none">
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                                    Tap <MoreVertical className="h-3 w-3 inline mx-0.5" /> (menu) in Chrome
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                                    Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                                    Tap <strong>Add</strong> to confirm
                                </li>
                            </ol>
                        </>
                    )}

                    {mode === "ios" && (
                        <>
                            <p className="text-xs text-slate-500 mt-0.5 mb-2">
                                Install this app on your iPhone:
                            </p>
                            <ol className="text-xs text-slate-700 space-y-1 list-none">
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                                    Tap <Share className="h-3 w-3 inline mx-0.5" /> (Share) at the bottom of Safari
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                                    Tap <strong>Add</strong> in the top right
                                </li>
                            </ol>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
