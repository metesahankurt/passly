import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CategoriesState {
  categories: string[];
  activeCategory: string | null;
  addCategory(name: string): void;
  removeCategory(name: string): void;
  setActiveCategory(name: string | null): void;
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      categories: [],
      activeCategory: null,
      addCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          categories: s.categories.includes(trimmed)
            ? s.categories
            : [...s.categories, trimmed],
        }));
      },
      removeCategory(name) {
        set((s) => ({
          categories: s.categories.filter((c) => c !== name),
          activeCategory: s.activeCategory === name ? null : s.activeCategory,
        }));
      },
      setActiveCategory(name) {
        set({ activeCategory: name });
      },
    }),
    {
      name: "psv-categories",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
