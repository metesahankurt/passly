"use client";

import { VaultUnlockPage } from "@workspace/core/pages/vault-unlock-page";
import { useRouter } from "@workspace/i18n/navigation";

export default function VaultPage() {
  const router = useRouter();
  return <VaultUnlockPage onUnlocked={() => router.push("/passwords")} />;
}
