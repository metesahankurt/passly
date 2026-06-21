"use client";

import {
  AUTO_LOCK_OPTIONS,
  useAutoLockStore,
} from "@workspace/core/stores/auto-lock-store";
import { Lock } from "lucide-react";

export function AutoLockCard() {
  const { timeout, setTimeout } = useAutoLockStore();

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="size-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Otomatik Kilit</p>
            <p className="text-[12px] text-muted-foreground">
              Hareketsizlik sonrası vault'u otomatik kilitle
            </p>
          </div>
        </div>

        <select
          className="rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          onChange={(e) => setTimeout(Number(e.target.value))}
          value={timeout}
        >
          {AUTO_LOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
