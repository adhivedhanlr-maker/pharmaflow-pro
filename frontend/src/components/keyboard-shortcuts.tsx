"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Command } from "lucide-react";

interface Shortcut {
    key: string;
    description: string;
    action?: () => void;
}

export function KeyboardShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Show keyboard shortcuts help (Ctrl+/)
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setShowHelp(true);
                return;
            }

            // Close dialogs with Escape
            if (e.key === 'Escape') {
                setShowHelp(false);
                return;
            }

            // Global navigation shortcuts (Alt + Key)
            if (e.altKey) {
                e.preventDefault();
                switch (e.key.toLowerCase()) {
                    case 'd':
                        router.push('/dashboard');
                        break;
                    case 'b':
                        router.push('/billing');
                        break;
                    case 'p':
                        router.push('/purchases');
                        break;
                    case 's':
                        router.push('/stock');
                        break;
                    case 'c':
                        router.push('/parties');
                        break;
                    case 'r':
                        router.push('/returns');
                        break;
                    case 'i':
                        router.push('/inventory');
                        break;
                    case 'u':
                        router.push('/users');
                        break;
                    case 'e':
                        router.push('/reports');
                        break;
                }
            }

            // Page-specific shortcuts
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                // Focus search (/)
                if (e.key === '/' && !isInputFocused()) {
                    e.preventDefault();
                    const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }

                // Add item in billing/purchases (F2)
                if (e.key === 'F2' && (pathname === '/billing' || pathname === '/purchases')) {
                    e.preventDefault();
                    const addButton = document.getElementById('add-item-trigger') ||
                        document.querySelector('button:has(svg.lucide-plus)') as HTMLButtonElement;
                    if (addButton) {
                        addButton.click();
                    }
                }

                // Save form (F9)
                if (e.key === 'F9') {
                    e.preventDefault();
                    const saveButton = document.querySelector('button:has(svg.lucide-save)') as HTMLButtonElement;
                    if (saveButton && !saveButton.disabled) {
                        saveButton.click();
                    }
                }

                // Print (F12)
                if (e.key === 'F12' && pathname === '/billing') {
                    e.preventDefault();
                    const printButton = document.querySelector('button:has(svg.lucide-printer)') as HTMLButtonElement;
                    if (printButton) {
                        printButton.click();
                    }
                }
            }

            // Quick actions (Ctrl + Key)
            if (e.ctrlKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'k':
                        e.preventDefault();
                        // Open command palette (future feature)
                        setShowHelp(true);
                        break;
                    case 'n':
                        // New item based on current page
                        if (pathname === '/billing') {
                            e.preventDefault();
                            // Trigger new invoice
                        } else if (pathname === '/parties') {
                            e.preventDefault();
                            const addPartyButton = document.querySelector('button:has-text("Add Customer"), button:has-text("Add Supplier")') as HTMLButtonElement;
                            if (addPartyButton) {
                                addPartyButton.click();
                            }
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, pathname]);

    const isInputFocused = () => {
        const activeElement = document.activeElement;
        return activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            activeElement?.getAttribute('contenteditable') === 'true';
    };

    const shortcuts: { category: string; items: Shortcut[] }[] = [
        {
            category: "Navigation",
            items: [
                { key: "Alt + D", description: "Go to Dashboard" },
                { key: "Alt + B", description: "Go to Billing" },
                { key: "Alt + P", description: "Go to Purchases" },
                { key: "Alt + S", description: "Go to Stock" },
                { key: "Alt + C", description: "Go to Parties (Customers)" },
                { key: "Alt + R", description: "Go to Returns" },
                { key: "Alt + I", description: "Go to Inventory" },
                { key: "Alt + U", description: "Go to Users" },
                { key: "Alt + E", description: "Go to Reports" },
            ],
        },
        {
            category: "Actions",
            items: [
                { key: "F2", description: "Add Item (Billing/Purchases)" },
                { key: "F9", description: "Save Current Form" },
                { key: "F12", description: "Print Invoice (Billing)" },
                { key: "/", description: "Focus Search" },
                { key: "Esc", description: "Close Dialog/Cancel" },
                { key: "Ctrl + K", description: "Command Palette" },
            ],
        },
        {
            category: "Help",
            items: [
                { key: "Ctrl + /", description: "Show Keyboard Shortcuts" },
            ],
        },
    ];

    return (
        <>
            {/* Floating keyboard hint */}
            <div className="fixed bottom-4 right-4 z-40 hidden lg:block">
                <button
                    onClick={() => setShowHelp(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
                >
                    <Command className="h-3 w-3" />
                    <span>Keyboard Shortcuts</span>
                    <Badge variant="outline" className="bg-slate-800 text-white border-slate-700">
                        Ctrl + /
                    </Badge>
                </button>
            </div>

            {/* Shortcuts help dialog */}
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Command className="h-5 w-5" />
                            Keyboard Shortcuts
                        </DialogTitle>
                        <DialogDescription>
                            Use these keyboard shortcuts to navigate faster
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {shortcuts.map((section) => (
                            <div key={section.category}>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                    {section.category}
                                </h3>
                                <div className="space-y-2">
                                    {section.items.map((shortcut) => (
                                        <div
                                            key={shortcut.key}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
                                        >
                                            <span className="text-sm text-slate-700">
                                                {shortcut.description}
                                            </span>
                                            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded">
                                                {shortcut.key}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-xs text-slate-500">
                            💡 Tip: Most forms support Tab navigation and Enter to submit
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
