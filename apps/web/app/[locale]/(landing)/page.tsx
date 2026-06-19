"use client";

import { useProfileStore } from "@workspace/core/stores/profile-store";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { useRouter } from "@workspace/i18n/navigation";
import { useEffect } from "react";

export default function Landing() {
  const router = useRouter();
  const { isSetup } = useProfileStore();
  const { initialize, status } = useVaultStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isSetup) {
      router.replace("/onboarding");
    } else if (status === "unlocked") {
      router.replace("/passwords");
    } else {
      router.replace("/vault");
    }
  }, [isSetup, status, router]);

  return null;
}
