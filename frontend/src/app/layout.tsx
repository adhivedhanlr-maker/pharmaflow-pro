import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PharmaFlow Pro",
  description: "B2B Pharmaceutical Distribution System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PharmaFlow Pro",
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

import { AuthProvider } from "@/context/auth-context";
import { SocketProvider } from "@/context/socket-context";
import { ShortcutProvider } from "@/context/shortcut-context";
import { MainLayout } from "@/components/layout/main-layout";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { RoleSwitcher } from "@/components/dev/role-switcher";
import { Toaster } from "@/components/ui/sonner";
import { GlobalHooks } from "@/components/layout/global-hooks";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SocketProvider>
            <ShortcutProvider>
              <MainLayout>{children}</MainLayout>
              <KeyboardShortcuts />
              <PWAInstallPrompt />
              <RoleSwitcher />
              <GlobalHooks />
              <Toaster />
            </ShortcutProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
