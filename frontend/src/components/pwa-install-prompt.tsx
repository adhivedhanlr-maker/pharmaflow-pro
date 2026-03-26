"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical, Share, X } from "lucide-react";

type InstallMode = "android-prompt" | "android-manual" | "ios" | "hidden";

const DISMISS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const INSTALL_PROMPT_SEEN_KEY = "pwa-beforeinstallprompt-seen-at";
const INSTALL_PROMPT_OUTCOME_KEY = "pwa-install-outcome";
const APP_INSTALLED_AT_KEY = "pwa-appinstalled-at";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export function PWAInstallPrompt() {
    const [mode, setMode] = useState<InstallMode>("hidden");
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const recordedInstall = localStorage.getItem(APP_INSTALLED_AT_KEY);
        if (isStandaloneMode() || recordedInstall) {
            setMode("hidden");
            return;
        }

        const dismissedAt = localStorage.getItem("pwa-dismissed-at");
        if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_WINDOW_MS) {
            setDismissed(true);
            return;
        }

        const ua = window.navigator.userAgent;
        const isIos = /iphone|ipad|ipod/i.test(ua);
        const isAndroid = /android/i.test(ua);
        const isChromeLike = /chrome|crios|edg|edga|samsungbrowser/i.test(ua);
        const isMobile = isIos || isAndroid;

        if (!isMobile) {
            return;
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, new Date().toISOString());
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setMode("android-prompt");
        };

        const handleAppInstalled = () => {
            localStorage.setItem(APP_INSTALLED_AT_KEY, new Date().toISOString());
            setDeferredPrompt(null);
            setDismissed(false);
            setMode("hidden");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        const fallback = window.setTimeout(() => {
            if (isStandaloneMode()) {
                return;
            }

            if (isIos) {
                setMode("ios");
            } else if (isAndroid) {
                setMode("android-manual");
            }
        }, isChromeLike ? 2500 : 1500);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            window.clearTimeout(fallback);
        };
    }, []);

    useEffect(() => {
        if (deferredPrompt) {
            setMode("android-prompt");
        }
    }, [deferredPrompt]);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            return;
        }

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        localStorage.setItem(INSTALL_PROMPT_OUTCOME_KEY, `${outcome}:${new Date().toISOString()}`);

        if (outcome === "accepted") {
            setMode("hidden");
        } else {
            setMode("android-manual");
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setMode("hidden");
        setDismissed(true);
        localStorage.setItem("pwa-dismissed-at", Date.now().toString());
    };

    if (mode === "hidden" || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button
                onClick={handleDismiss}
                className="absolute right-3 top-3 rounded-full p-1 hover:bg-slate-100"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4 text-slate-500" />
            </button>

            <div className="flex items-start gap-3 pr-6">
                <img
                    src="/icon-192x192.png"
                    alt="PharmaFlow Pro"
                    className="h-12 w-12 flex-shrink-0 rounded-xl"
                />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Install PharmaFlow Pro</p>

                    {mode === "android-prompt" && (
                        <>
                            <p className="mb-3 mt-0.5 text-xs text-slate-500">
                                Install PharmaFlow as an app so it opens full-screen and shows up with your apps.
                            </p>
                            <Button onClick={handleInstall} size="sm" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Install App
                            </Button>
                        </>
                    )}

                    {mode === "android-manual" && (
                        <>
                            <p className="mb-2 mt-0.5 text-xs text-slate-500">
                                To make PharmaFlow behave like a real app, use your browser&apos;s install option:
                            </p>
                            <ol className="list-none space-y-1 text-xs text-slate-700">
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">1</span>
                                    Tap <MoreVertical className="mx-0.5 inline h-3 w-3" /> in your browser menu
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">2</span>
                                    Choose <strong>&ldquo;Install app&rdquo;</strong> if available
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">3</span>
                                    Only use <strong>&ldquo;Add to Home screen&rdquo;</strong> if there is no install option
                                </li>
                            </ol>
                            <p className="mt-3 text-[11px] text-slate-500">
                                Installing the app usually makes it appear in the app drawer. A homescreen shortcut may not.
                            </p>
                        </>
                    )}

                    {mode === "ios" && (
                        <>
                            <p className="mb-2 mt-0.5 text-xs text-slate-500">
                                Install this app on your iPhone:
                            </p>
                            <ol className="list-none space-y-1 text-xs text-slate-700">
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">1</span>
                                    Tap <Share className="mx-0.5 inline h-3 w-3" /> at the bottom of Safari
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">2</span>
                                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold">3</span>
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
