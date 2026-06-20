"use client";

import { routing } from "@workspace/i18n/routing";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const LOCALE_STORAGE_KEY = "passly-locale";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    const locale =
      saved && (routing.locales as readonly string[]).includes(saved)
        ? saved
        : routing.defaultLocale;
    router.replace(`/${locale}`);
  }, [router]);

  return null;
}
