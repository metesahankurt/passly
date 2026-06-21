import { create } from "zustand";
import { persist } from "zustand/middleware";

// timeout in minutes, 0 = never
export const AUTO_LOCK_OPTIONS = [
  { label: "Hiçbir zaman", value: 0 },
  { label: "1 dakika", value: 1 },
  { label: "5 dakika", value: 5 },
  { label: "15 dakika", value: 15 },
  { label: "30 dakika", value: 30 },
  { label: "1 saat", value: 60 },
] as const;

interface AutoLockState {
  setTimeout(minutes: number): void;
  timeout: number;
}

export const useAutoLockStore = create<AutoLockState>()(
  persist(
    (set) => ({
      timeout: 15,
      setTimeout: (minutes) => set({ timeout: minutes }),
    }),
    { name: "passly-auto-lock" }
  )
);
