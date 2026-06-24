"use client";

import type { VaultEntry } from "@workspace/core/lib/vault-crypto";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { useTranslations } from "@workspace/i18n";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

// ─── Entropy calculation ──────────────────────────────────────────────────────

function entropy(password: string): number {
  const unique = new Set(password.split("")).size;
  if (!(unique && password.length)) {
    return 0;
  }
  return password.length * Math.log2(unique);
}

type Strength = "critical" | "weak" | "fair" | "good" | "strong";

function getStrength(bits: number): {
  strength: Strength;
  labelKey: string;
  color: string;
  bar: string;
} {
  if (bits < 28) {
    return {
      strength: "critical",
      labelKey: "strengthCritical",
      color: "text-red-500",
      bar: "bg-red-500 w-[12%]",
    };
  }
  if (bits < 40) {
    return {
      strength: "weak",
      labelKey: "strengthWeak",
      color: "text-orange-500",
      bar: "bg-orange-500 w-[30%]",
    };
  }
  if (bits < 55) {
    return {
      strength: "fair",
      labelKey: "strengthFair",
      color: "text-yellow-500",
      bar: "bg-yellow-500 w-[52%]",
    };
  }
  if (bits < 70) {
    return {
      strength: "good",
      labelKey: "strengthGood",
      color: "text-lime-500",
      bar: "bg-lime-500 w-[75%]",
    };
  }
  return {
    strength: "strong",
    labelKey: "strengthStrong",
    color: "text-emerald-500",
    bar: "bg-emerald-500 w-full",
  };
}

const OLD_DAYS = 90;
const MS_PER_DAY = 86_400_000;

// ─── Entry row ───────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  badge,
  badgeColor,
  detail,
}: {
  entry: VaultEntry;
  badge: string;
  badgeColor: string;
  detail: string;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{entry.title}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wide",
              badgeColor
            )}
          >
            {badge}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {detail}
        </p>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1">
        <span className="select-none font-mono text-[12px] text-muted-foreground">
          {visible
            ? entry.password
            : "•".repeat(Math.min(entry.password.length, 12))}
        </span>
        <button
          className="text-muted-foreground/60 transition-colors hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          type="button"
        >
          {visible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
        <button
          className="text-muted-foreground/60 transition-colors hover:text-foreground"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <CheckCircle2 className="size-3 text-green-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          color
        )}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-bold text-2xl leading-none">{count}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HealthPage() {
  const { vault } = useVaultStore();
  const t = useTranslations("HealthPage");
  const [activeSection, setActiveSection] = useState<
    "weak" | "duplicate" | "old" | null
  >(null);

  const passwords = (vault?.entries ?? []).filter(
    (e) => e.itemType !== "card" && e.password
  );

  const now = Date.now();

  const weak = passwords.filter((e) => entropy(e.password) < 40);
  const old = passwords.filter(
    (e) => now - e.updatedAt > OLD_DAYS * MS_PER_DAY
  );

  const pwMap = new Map<string, VaultEntry[]>();
  for (const e of passwords) {
    const list = pwMap.get(e.password) ?? [];
    list.push(e);
    pwMap.set(e.password, list);
  }
  const duplicate = passwords.filter(
    (e) => (pwMap.get(e.password)?.length ?? 0) > 1
  );

  const totalIssues = new Set([
    ...weak.map((e) => e.id),
    ...duplicate.map((e) => e.id),
    ...old.map((e) => e.id),
  ]).size;

  const score =
    passwords.length === 0
      ? 100
      : Math.round(((passwords.length - totalIssues) / passwords.length) * 100);

  const scoreColor =
    score >= 80
      ? "text-emerald-500"
      : score >= 50
        ? "text-yellow-500"
        : "text-red-500";

  const sections = [
    {
      key: "weak" as const,
      entries: weak,
      badge: t("weakBadge"),
      badgeColor: "bg-orange-500/10 text-orange-500",
    },
    {
      key: "duplicate" as const,
      entries: duplicate,
      badge: t("duplicateBadge"),
      badgeColor: "bg-red-500/10 text-red-500",
    },
    {
      key: "old" as const,
      entries: old,
      badge: `+${OLD_DAYS}d`,
      badgeColor: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="font-semibold text-xl">{t("title")}</h1>
          <p className="text-muted-foreground text-xs">
            {t("subtitle", { count: passwords.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-bold text-3xl tabular-nums", scoreColor)}>
            {score}
          </span>
          <span className="text-muted-foreground text-sm">/ 100</span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Score bar */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {score >= 80 ? (
                <ShieldCheck className="size-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-5 text-orange-500" />
              )}
              <span className="font-semibold text-sm">
                {score >= 80
                  ? t("scoreGood")
                  : score >= 50
                    ? t("scoreImprove")
                    : t("scoreAttention")}
              </span>
            </div>
            <span className={cn("font-bold text-lg", scoreColor)}>
              {score}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                score >= 80
                  ? "bg-emerald-500"
                  : score >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            color="bg-orange-500/10 text-orange-500"
            count={weak.length}
            icon={AlertTriangle}
            label={t("weakLabel")}
          />
          <StatCard
            color="bg-red-500/10 text-red-500"
            count={duplicate.length}
            icon={RefreshCw}
            label={t("duplicateLabel")}
          />
          <StatCard
            color="bg-muted text-muted-foreground"
            count={old.length}
            icon={ShieldAlert}
            label={t("oldLabel", { days: OLD_DAYS })}
          />
        </div>

        {/* Issue sections */}
        {sections.map(({ key, entries, badge, badgeColor }) => {
          if (entries.length === 0) {
            return null;
          }
          const open = activeSection === key;
          return (
            <div
              className="overflow-hidden rounded-2xl border bg-card"
              key={key}
            >
              <button
                className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40"
                onClick={() => setActiveSection(open ? null : key)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-wide",
                      badgeColor
                    )}
                  >
                    {badge}
                  </span>
                  <span className="font-medium text-sm">
                    {t("recordCount", { count: entries.length })}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {open ? t("hide") : t("show")}
                </span>
              </button>

              {open && (
                <div className="flex flex-col gap-2 border-t px-4 py-3">
                  {entries.map((entry) => {
                    const bits = entropy(entry.password);
                    const { labelKey } = getStrength(bits);
                    const daysSince = Math.floor(
                      (now - entry.updatedAt) / MS_PER_DAY
                    );
                    const detail =
                      key === "weak"
                        ? t("entropyDetail", {
                            bits: Math.round(bits),
                            label: t(labelKey as Parameters<typeof t>[0]),
                          })
                        : key === "duplicate"
                          ? t("duplicateDetail", {
                              count: pwMap.get(entry.password)?.length ?? 2,
                            })
                          : t("oldDetail", { days: daysSince });

                    return (
                      <EntryRow
                        badge={badge}
                        badgeColor={badgeColor}
                        detail={detail}
                        entry={entry}
                        key={entry.id}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalIssues === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <ShieldCheck className="size-10 text-emerald-500" />
            <div>
              <p className="font-semibold">{t("allClearTitle")}</p>
              <p className="mt-1 text-muted-foreground text-sm">
                {t("allClearDescription")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
