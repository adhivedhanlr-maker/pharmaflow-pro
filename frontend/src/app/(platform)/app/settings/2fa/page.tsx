"use client";

import { SettingsBreadcrumb } from "@/components/ui/settings-breadcrumb";
import TwoFactorSetup from "@/components/settings/two-factor-setup";

export default function TwoFactorPage() {
    return (
        <div className="space-y-6 max-w-lg">
            <SettingsBreadcrumb crumbs={[
                { label: "Settings", href: "/app/settings" },
                { label: "Two-Factor Authentication" },
            ]} />

            <div>
                <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
                <p className="text-muted-foreground">Add an extra layer of security to your account.</p>
            </div>

            <TwoFactorSetup />
        </div>
    );
}
