"use client";

import { PasswordsPage } from "@workspace/core/pages/passwords-page";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { useRouter } from "@workspace/i18n/navigation";
import { useEffect } from "react";

export default function Passwords() {
  const { status, initialize } = useVaultStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === "empty" || status === "locked") {
      router.replace("/vault");
    }
  }, [status, router]);

  return <PasswordsPage />;
}
