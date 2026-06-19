"use client";

import {
  type ActivityEntry,
  type ActivityType,
  useActivityStore,
} from "@workspace/core/stores/activity-store";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Bell,
  Download,
  Globe,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<ActivityType, LucideIcon> = {
  vault_created: ShieldCheck,
  vault_unlocked: Unlock,
  entry_added: Plus,
  entry_updated: Pencil,
  entry_deleted: Trash2,
  vault_exported: Download,
  vault_imported: Upload,
  browser_imported: Globe,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  vault_created: "text-emerald-500",
  vault_unlocked: "text-sky-500",
  entry_added: "text-primary",
  entry_updated: "text-amber-500",
  entry_deleted: "text-destructive",
  vault_exported: "text-violet-500",
  vault_imported: "text-violet-500",
  browser_imported: "text-blue-500",
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 60) return "Az önce";
  if (m < 60) return `${m} dk önce`;
  if (h < 24) return `${h} saat önce`;
  if (d === 1) return "Dün";
  return `${d} gün önce`;
}

export function NotificationCenter() {
  const { activities, markAllRead, markRead } = useActivityStore();
  const unread = activities.filter((a) => !a.read);
  const hasUnread = unread.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild={true}>
        <Button
          aria-label="Bildirimler"
          className="relative"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell className="size-4" />
          {hasUnread && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="hidden w-96 gap-0 p-0 md:flex">
        <div className="flex items-center justify-between border-b p-4">
          <span className="text-sm font-semibold">Bildirimler</span>
          {hasUnread && (
            <Button
              className="h-auto p-0 text-xs"
              variant="link"
              onClick={markAllRead}
            >
              Tümünü okundu işaretle
            </Button>
          )}
        </div>

        <Tabs className="gap-0" defaultValue="all">
          <div className="p-3">
            <TabsList className="w-full">
              <TabsTrigger value="all">Tümü</TabsTrigger>
              <TabsTrigger value="unread">
                Okunmadı
                {hasUnread && (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unread.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <ScrollArea className="h-80 p-3 pt-0">
              <ActivityList items={activities} onRead={markRead} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread">
            <ScrollArea className="h-80 p-3 pt-0">
              <ActivityList items={unread} onRead={markRead} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function ActivityList({
  items,
  onRead,
}: {
  items: ActivityEntry[];
  onRead: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <Empty className="rounded-md border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bell />
          </EmptyMedia>
          <EmptyTitle>Bildirim yok</EmptyTitle>
          <EmptyDescription>Yapılan işlemler burada görünecek.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? KeyRound;
        const iconColor = TYPE_COLORS[item.type] ?? "text-muted-foreground";
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onRead(item.id)}
            className="flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted/40">
              <Icon className={`size-4 ${iconColor}`} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className={`text-sm ${item.read ? "font-normal text-muted-foreground" : "font-semibold text-foreground"}`}
              >
                {item.title}
              </span>
              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                {item.description}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatRelativeTime(item.timestamp)}
              </span>
              {!item.read && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
