"use client";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "@workspace/core/providers/theme-provider";
import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  const { resolvedTheme } = useTheme();
  const appWindow = getCurrentWindow();
  const isDarkMode = resolvedTheme === "dark";

  const minimize = async () => {
    await appWindow.minimize();
  };

  const toggleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const close = async () => {
    await appWindow.close();
  };

  return (
    <div
      className="fixed top-0 right-0 left-0 z-50 flex h-8 select-none items-center border-b bg-sidebar"
      data-tauri-drag-region
    >
      <div
        className="flex h-8 w-12 items-center justify-center"
        data-tauri-drag-region
      >
        <div
          aria-hidden={true}
          className={`size-4 bg-center bg-contain bg-no-repeat ${isDarkMode ? "brightness-0 invert" : ""}`}
          style={{ backgroundImage: "url('/logo-light.png')" }}
        />
      </div>
      <div className="h-8 flex-1" data-tauri-drag-region />
      <div className="flex items-center">
        <button
          aria-label="Minimize"
          className="flex h-8 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent"
          onClick={minimize}
          type="button"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          aria-label="Maximize"
          className="flex h-8 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent"
          onClick={toggleMaximize}
          type="button"
        >
          <Square className="size-3" />
        </button>
        <button
          aria-label="Close"
          className="flex h-8 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
          onClick={close}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
