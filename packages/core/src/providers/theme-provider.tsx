"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeProviderProps {
  attribute?: "class" | `data-${string}`;
  children: ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  storageKey?: string;
}

interface ThemeContextValue {
  forcedTheme?: string;
  resolvedTheme?: ResolvedTheme;
  setTheme: Dispatch<SetStateAction<string>>;
  systemTheme?: ResolvedTheme;
  theme?: string;
  themes: string[];
}

const THEME_VALUES = ["light", "dark"] as const;
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const noopSetTheme: Dispatch<SetStateAction<string>> = () => undefined;
const ThemeContext = createContext<ThemeContextValue>({
  setTheme: noopSetTheme,
  themes: [],
});

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";

const getStoredTheme = (storageKey: string, defaultTheme: Theme): string => {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  try {
    return localStorage.getItem(storageKey) ?? defaultTheme;
  } catch {
    return defaultTheme;
  }
};

const disableTransitions = () => {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}")
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
};

const applyTheme = ({
  attribute,
  disableTransitionOnChange,
  enableColorScheme,
  resolvedTheme,
}: {
  attribute: "class" | `data-${string}`;
  disableTransitionOnChange: boolean;
  enableColorScheme: boolean;
  resolvedTheme: ResolvedTheme;
}) => {
  const restoreTransitions = disableTransitionOnChange
    ? disableTransitions()
    : null;
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove(...THEME_VALUES);
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }

  restoreTransitions?.();
};

export function ThemeProvider({
  children,
  attribute = "data-theme",
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() =>
    getStoredTheme(storageKey, defaultTheme)
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  const resolvedTheme =
    theme === "system" && enableSystem ? systemTheme : (theme as ResolvedTheme);

  const setTheme: Dispatch<SetStateAction<string>> = useCallback(
    (value) => {
      setThemeState((currentTheme) => {
        const nextTheme =
          typeof value === "function" ? value(currentTheme) : value;

        try {
          localStorage.setItem(storageKey, nextTheme);
        } catch {
          // Ignore unavailable storage, the in-memory theme still updates.
        }

        return nextTheme;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const updateSystemTheme = () => setSystemTheme(getSystemTheme());

    updateSystemTheme();
    media.addEventListener("change", updateSystemTheme);

    return () => {
      media.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  useEffect(() => {
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") {
      return;
    }

    applyTheme({
      attribute,
      disableTransitionOnChange,
      enableColorScheme,
      resolvedTheme,
    });
  }, [attribute, disableTransitionOnChange, enableColorScheme, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      theme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
