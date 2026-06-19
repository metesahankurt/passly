"use client";

import { useCategoriesStore } from "@workspace/core/stores/categories-store";
import { useProfileStore } from "@workspace/core/stores/profile-store";
import { useMounted } from "@workspace/core/hooks/use-mounted";
import { useSidebarStore } from "@workspace/core/stores/sidebar-store";
import { cn } from "@workspace/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { useTheme } from "next-themes";
import { FolderOpen, KeyRound, Plus, X } from "lucide-react";
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
}

export function AppSidebar({
  pathname,
  LinkComponent = "a",
  ...props
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { variant } = useSidebarStore();
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();

  const { name, avatarColor } = useProfileStore();
  const { categories, activeCategory, addCategory, removeCategory, setActiveCategory } =
    useCategoriesStore();

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleLinkClick = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setAddingCategory(false);
    }
  };

  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  const isPasswordsActive = pathname === "/passwords" || pathname.startsWith("/passwords");

  if (!mounted) return null;

  return (
    <Sidebar collapsible="icon" variant={variant} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild={true}
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <LinkComponent href="/passwords" onClick={handleLinkClick}>
                <img
                  src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                  alt="Passly"
                  className="size-6 shrink-0 object-contain"
                />
                <span className="font-semibold text-base">Passly</span>
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
                <span>Şifreler</span>
              </LinkComponent>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Kategoriler
          </p>
        </div>

        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              className="cursor-pointer"
            >
              <FolderOpen className="size-4" />
              <span>Tümü</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {categories.map((cat) => (
            <SidebarMenuItem key={cat}>
              <SidebarMenuButton
                isActive={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className="group/cat cursor-pointer"
              >
                <FolderOpen className="size-4" />
                <span className="flex-1 truncate">{cat}</span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCategory(cat);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      removeCategory(cat);
                    }
                  }}
                  className={cn(
                    "ml-auto hidden size-4 items-center justify-center rounded text-muted-foreground",
                    "opacity-0 transition-opacity hover:text-destructive",
                    "group-hover/cat:flex group-hover/cat:opacity-100"
                  )}
                  title="Sil"
                >
                  <X className="size-3" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {addingCategory ? (
            <SidebarMenuItem>
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") {
                      setAddingCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  placeholder="Kategori adı…"
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setAddingCategory(true)}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
                <span className="text-xs">Kategori Ekle</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm">
                <span className="truncate font-medium">{name || "Kullanıcı"}</span>
                <span className="truncate text-xs text-muted-foreground">Yerel Profil</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
