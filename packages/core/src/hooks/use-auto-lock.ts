"use client";

import { useAutoLockStore } from "@workspace/core/stores/auto-lock-store";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function useAutoLock() {
  const timeout = useAutoLockStore((s) => s.timeout);
  const { status, lock } = useVaultStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "unlocked" || timeout === 0) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock();
      }, timeout * 60 * 1000);
    };

    reset();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, [status, timeout, lock]);
}
