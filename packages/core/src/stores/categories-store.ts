import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SpecialFilter = "favorites" | "recent" | null;

interface CategoriesState {
  activeCategory: string | null;
  addCategory(name: string): void;
  categories: string[];
  removeCategory(name: string): void;
  replaceCategories(categories: string[]): void;
  setActiveCategory(name: string | null): void;
  setSpecialFilter(filter: SpecialFilter): void;
  specialFilter: SpecialFilter;
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      categories: [],
      activeCategory: null,
      specialFilter: null,
      addCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) {
          return;
        }
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
      replaceCategories(categories) {
        const normalizedCategories = Array.from(
          new Set(categories.map((category) => category.trim()).filter(Boolean))
        );
        set((state) => ({
          categories: normalizedCategories,
          activeCategory:
            state.activeCategory &&
            normalizedCategories.includes(state.activeCategory)
              ? state.activeCategory
              : null,
        }));
      },
      setActiveCategory(name) {
        set({ activeCategory: name, specialFilter: null });
      },
      setSpecialFilter(filter) {
        set({ specialFilter: filter, activeCategory: null });
      },
    }),
    {
      name: "psv-categories",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
