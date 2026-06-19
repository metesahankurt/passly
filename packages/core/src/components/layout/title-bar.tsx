"use client";

import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  const invoke = typeof window !== "undefined"
    ? (window as any).__TAURI_INTERNALS__?.invoke
    : null;

  const minimize = () => invoke?.("plugin:window|minimize", { label: "main" });
  const toggleMaximize = () => invoke?.("plugin:window|toggle_maximize", { label: "main" });
  const close = () => invoke?.("plugin:window|close", { label: "main" });

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 z-50 flex h-8 items-center bg-sidebar select-none border-b border-sidebar-border"
    >
      <div className="flex-1" data-tauri-drag-region />
      <div className="flex items-center">
        <button
          type="button"
          onClick={minimize}
          className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Minimize"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleMaximize}
          className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Maximize"
        >
          <Square className="size-3" />
        </button>
        <button
          type="button"
          onClick={close}
          className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
