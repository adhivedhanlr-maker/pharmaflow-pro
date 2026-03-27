"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
    label: string;
    href?: string;
}

export function SettingsBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
    return (
        <nav className="flex items-center gap-1 text-sm mb-6">
            {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {crumb.href ? (
                        <Link href={crumb.href} className="text-slate-500 hover:text-slate-800 transition-colors">
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="font-semibold text-slate-900">{crumb.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
