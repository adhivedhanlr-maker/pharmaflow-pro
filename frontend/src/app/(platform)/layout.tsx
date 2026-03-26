"use client";

import { AuthProvider } from "@/context/auth-context";
import { SocketProvider } from "@/context/socket-context";
import { ShortcutProvider } from "@/context/shortcut-context";
import { MainLayout } from "@/components/layout/main-layout";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { GlobalHooks } from "@/components/layout/global-hooks";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SocketProvider>
        <ShortcutProvider>
          <MainLayout>{children}</MainLayout>
          <KeyboardShortcuts />
          <PWAInstallPrompt />
          <GlobalHooks />
          <Toaster />
        </ShortcutProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
