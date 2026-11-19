"use client";

import { AutoLockCard } from "@workspace/core/components/common/auto-lock-card";
import { ChangeMasterPasswordCard } from "@workspace/core/components/common/change-master-password-card";
import { LanguageCard } from "@workspace/core/components/common/language-card";
import { ModeCard } from "@workspace/core/components/common/mode-card";
import { ProfileCard } from "@workspace/core/components/common/profile-card";
import { SidebarVariantCard } from "@workspace/core/components/common/sidebar-variant-card";
import { ThemesList } from "@workspace/core/components/common/themes-list";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";

export function SettingsPage() {
  const unlocked = useVaultStore((state) => state.status === "unlocked");

  return (
    <ScrollArea className="w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-28 md:pb-4">
        <ProfileCard />
        <AutoLockCard />
        {unlocked && <ChangeMasterPasswordCard />}
        <LanguageCard />
        <ModeCard />
        <div className="hidden md:block">
          <SidebarVariantCard />
        </div>
        <ThemesList />
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
