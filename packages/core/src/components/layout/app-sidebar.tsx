"use client";

import { useMounted } from "@workspace/core/hooks/use-mounted";
import { useCategoriesStore } from "@workspace/core/stores/categories-store";
import { useProfileStore } from "@workspace/core/stores/profile-store";
import { useSidebarStore } from "@workspace/core/stores/sidebar-store";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { siteConfig } from "@workspace/core/config/site";
import { useTranslations } from "@workspace/i18n";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { ExternalLink, FolderOpen, Github, KeyRound, Plus, Tag, Trash2, X } from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";
import type { ComponentType } from "react";
import { useCallback, useState } from "react";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  LinkComponent?:
    | ComponentType<{
        href: string;
        children: React.ReactNode;
        onClick?: () => void;
        className?: string;
      }>
    | "a";
  pathname: string;
  navigate?: (path: string) => void;
}

export function AppSidebar({
  pathname,
  LinkComponent = "a",
  navigate,
  ...props
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { variant } = useSidebarStore();
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const t = useTranslations("Navigation");

  const { name, avatarColor } = useProfileStore();
  const {
    categories,
    activeCategory,
    addCategory,
    removeCategory,
    setActiveCategory,
  } = useCategoriesStore();
  const { deleteEntriesByCategory, clearCategoryFromEntries, vault } = useVaultStore();

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const openExternal = (url: string) => {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      (window as any).__TAURI_INTERNALS__.invoke("plugin:opener|open_url", { url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setAddingCategory(false);
    }
  };

  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  const isPasswordsActive =
    pathname === "/passwords" || pathname.startsWith("/passwords");

  if (!mounted) {
    return null;
  }

  return (
    <>
    <Sidebar collapsible="icon" variant={variant} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild={true}
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <LinkComponent href="/passwords" onClick={handleLinkClick}>
                <span
                  aria-label="Passly"
                  className={`size-6 shrink-0 bg-center bg-contain bg-no-repeat ${resolvedTheme === "dark" ? "brightness-0 invert" : ""}`}
                  role="img"
                  style={{ backgroundImage: "url('/logo-light.png')" }}
                />
                <span className="truncate font-semibold text-base">
                  {name ? `${name} Vault` : "Passly"}
                </span>
              </LinkComponent>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarMenu className="px-2 py-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild={true} isActive={isPasswordsActive}>
              <LinkComponent href="/passwords" onClick={handleLinkClick}>
                <KeyRound className="size-4" />
                <span>{t("passwords")}</span>
              </LinkComponent>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-4 py-2">
          <p className="font-semibold text-[11px] text-muted-foreground/60 uppercase tracking-wider">
            {t("categories")}
          </p>
        </div>

        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              className="cursor-pointer"
              isActive={activeCategory === null}
              onClick={() => {
                setActiveCategory(null);
                if (!isPasswordsActive && navigate) navigate("/passwords");
                handleLinkClick();
              }}
            >
              <FolderOpen className="size-4" />
              <span>{t("all")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {categories.map((cat) => (
            <SidebarMenuItem key={cat}>
              <SidebarMenuButton
                className="group/cat cursor-pointer"
                isActive={activeCategory === cat}
                onClick={() => {
                  setActiveCategory(cat);
                  if (!isPasswordsActive && navigate) navigate("/passwords");
                  handleLinkClick();
                }}
              >
                <FolderOpen className="size-4" />
                <span className="flex-1 truncate">{cat}</span>
              </SidebarMenuButton>
              <SidebarMenuAction
                aria-label={t("deleteCategory")}
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToDelete(cat);
                }}
                showOnHover={true}
                title={t("deleteCategory")}
                type="button"
              >
                <X className="size-3" />
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}

          {addingCategory ? (
            <SidebarMenuItem>
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddCategory();
                    }
                    if (e.key === "Escape") {
                      setAddingCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  placeholder={t("categoryName")}
                  value={newCategoryName}
                />
                <button
                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  onClick={handleAddCategory}
                  type="button"
                >
                  <Plus className="size-3" />
                </button>
                <button
                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAddingCategory(false);
                    setNewCategoryName("");
                  }}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setAddingCategory(true)}
              >
                <Plus className="size-4" />
                <span className="text-xs">{t("addCategory")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden px-3 pb-1 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => openExternal(siteConfig.links.profile)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:bg-muted hover:text-muted-foreground w-full"
          >
            <Github className="size-3 shrink-0" />
            <span className="truncate">@{siteConfig.owner}</span>
            <ExternalLink className="size-2.5 ml-auto shrink-0 opacity-50" />
          </button>
          <button
            type="button"
            onClick={() => openExternal(siteConfig.links.releases)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:bg-muted hover:text-muted-foreground w-full"
          >
            <Tag className="size-3 shrink-0" />
            <span className="truncate">{t("latestUpdates")}</span>
            <ExternalLink className="size-2.5 ml-auto shrink-0 opacity-50" />
          </button>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild={true} size="lg">
              <LinkComponent href="/settings" onClick={handleLinkClick}>
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-sm text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
                <div className="grid flex-1 text-left text-sm">
                  <span className="truncate font-medium">
                    {name || t("user")}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {t("localProfile")}
                  </span>
                </div>
              </LinkComponent>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

      {categoryToDelete && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                {t("deleteCategoryTitle")}
              </DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-foreground">"{categoryToDelete}"</span>
                {" "}
                {t("deleteCategoryDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {t("deleteCategoryWarning")}
            </div>

            {(() => {
              const count = vault?.entries.filter((e) => e.category === categoryToDelete).length ?? 0;
              return (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearCategoryFromEntries(categoryToDelete);
                      removeCategory(categoryToDelete);
                      setCategoryToDelete(null);
                    }}
                    className="flex flex-col rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="font-medium text-sm">{t("deleteCategoryOnly")}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {count > 0
                        ? `${count} ${t("deleteCategoryOnlyDesc")}`
                        : t("deleteCategoryOnlyDescEmpty")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteEntriesByCategory(categoryToDelete);
                      removeCategory(categoryToDelete);
                      setCategoryToDelete(null);
                    }}
                    className="flex flex-col rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-left transition-colors hover:bg-destructive/10"
                  >
                    <span className="font-medium text-sm text-destructive">{t("deleteCategoryWithAll")}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {count > 0
                        ? `${count} ${t("deleteCategoryWithAllDesc")}`
                        : t("deleteCategoryWithAllDescEmpty")}
                    </span>
                  </button>
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
