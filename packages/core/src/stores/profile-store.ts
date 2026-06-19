import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const AVATAR_COLORS = [
  "#7c3aed", "#2563eb", "#16a34a", "#dc2626",
  "#ea580c", "#0891b2", "#be185d", "#854d0e",
  "#475569", "#1d4ed8",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];
export { AVATAR_COLORS };

interface ProfileState {
  name: string;
  avatarColor: AvatarColor;
  isSetup: boolean;
  setProfile(name: string, avatarColor: AvatarColor): void;
  resetProfile(): void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: "",
      avatarColor: "#7c3aed",
      isSetup: false,
      setProfile(name, avatarColor) {
        set({ name, avatarColor, isSetup: true });
      },
      resetProfile() {
        set({ name: "", avatarColor: "#7c3aed", isSetup: false });
      },
    }),
    {
      name: "psv-profile",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
