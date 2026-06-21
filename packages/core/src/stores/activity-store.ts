import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityType =
  | "vault_created"
  | "vault_unlocked"
  | "entry_added"
  | "entry_updated"
  | "entry_deleted"
  | "vault_exported"
  | "vault_imported"
  | "browser_imported";

export interface ActivityEntry {
  description: string;
  id: string;
  read: boolean;
  timestamp: number;
  title: string;
  type: ActivityType;
}

interface ActivityState {
  activities: ActivityEntry[];
  addActivity(data: {
    type: ActivityType;
    title: string;
    description: string;
  }): void;
  markAllRead(): void;
  markRead(id: string): void;
}

const MAX = 50;

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],

      addActivity({ type, title, description }) {
        const entry: ActivityEntry = {
          id: crypto.randomUUID(),
          type,
          title,
          description,
          timestamp: Date.now(),
          read: false,
        };
        set({ activities: [entry, ...get().activities].slice(0, MAX) });
      },

      markAllRead() {
        set({
          activities: get().activities.map((a) => ({ ...a, read: true })),
        });
      },

      markRead(id) {
        set({
          activities: get().activities.map((a) =>
            a.id === id ? { ...a, read: true } : a
          ),
        });
      },
    }),
    { name: "vault-activity" }
  )
);
