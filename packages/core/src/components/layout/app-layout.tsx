"use client";

import { CommandPalette } from "@workspace/core/components/common/command-palette";
import { DesktopUpdateDialog } from "@workspace/core/components/common/desktop-update-dialog";
import { AppHeader } from "@workspace/core/components/layout/app-header";
import { AppSidebar } from "@workspace/core/components/layout/app-sidebar";
import { TitleBar } from "@workspace/core/components/layout/title-bar";
import { useAutoLock } from "@workspace/core/hooks/use-auto-lock";
import { ThemeProvider } from "@workspace/core/providers/theme-provider";
import { useCommandPaletteStore } from "@workspace/core/stores/command-palette-store";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
  LinkComponent?:
    | ComponentType<{
        href: string;
        children: React.ReactNode;
        onClick?: () => void;
        className?: string;
      }>
    | "a";
  navigate: (path: string) => void;
  pathname: string;
}

function KeyboardShortcuts() {
  const toggle = useCommandPaletteStore((s) => s.toggle);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  return null;
}

function AutoLockGuard() {
  useAutoLock();
  return null;
}

export function AppLayout({
  children,
  pathname,
  navigate,
  LinkComponent,
}: AppLayoutProps) {
  const [isTauri, setIsTauri] = useState(false);
  const isOnboarding = pathname === "/onboarding" || pathname === "/" || !pathname;

  useEffect(() => {
    setIsTauri(
      typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    );
  }, []);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [isTauri]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange={true}
      enableColorScheme={true}
      enableSystem={true}
    >
      <TooltipProvider>
        {isTauri && <TitleBar />}
        {isOnboarding ? (
          <main
            className="h-screen overflow-hidden"
            style={{
              paddingTop: isTauri ? "2rem" : "env(safe-area-inset-top)",
            }}
          >
            {children}
            <Toaster />
            {isTauri && <DesktopUpdateDialog />}
          </main>
        ) : (
          <SidebarProvider
            className="h-screen overflow-hidden pb-[env(safe-area-inset-bottom)]"
            style={{
              paddingTop: isTauri ? "2rem" : "env(safe-area-inset-top)",
            }}
          >
            <AppSidebar
              className={isTauri ? "top-8 h-[calc(100svh-2rem)]" : undefined}
              LinkComponent={LinkComponent}
              pathname={pathname}
              navigate={navigate}
            />
            <SidebarInset>
              <AppHeader LinkComponent={LinkComponent} pathname={pathname} />
              {children}
              <Toaster />
            </SidebarInset>
            <CommandPalette navigate={navigate} />
            <KeyboardShortcuts />
            <AutoLockGuard />
            {isTauri && <DesktopUpdateDialog />}
          </SidebarProvider>
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}
