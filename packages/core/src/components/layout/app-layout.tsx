"use client";

import { AppHeader } from "@workspace/core/components/layout/app-header";
import { AppSidebar } from "@workspace/core/components/layout/app-sidebar";
import { CommandPalette } from "@workspace/core/components/common/command-palette";
import { ThemeProvider } from "@workspace/core/providers/theme-provider";
import { useCommandPaletteStore } from "@workspace/core/stores/command-palette-store";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { type ComponentType, type ReactNode, useEffect } from "react";

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

export function AppLayout({
  children,
  pathname,
  navigate,
  LinkComponent,
}: AppLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange={true}
      enableColorScheme={true}
      enableSystem={true}
    >
      <TooltipProvider>
        <SidebarProvider className="h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <AppSidebar LinkComponent={LinkComponent} pathname={pathname} />
          <SidebarInset>
            <AppHeader LinkComponent={LinkComponent} pathname={pathname} />
            {children}
            <Toaster />
          </SidebarInset>
          <CommandPalette navigate={navigate} />
          <KeyboardShortcuts />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
