"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { useCategoriesStore } from "@workspace/core/stores/categories-store";
import type { VaultEntry } from "@workspace/core/lib/vault-crypto";
import { parseBrowserCSV, type BrowserImportEntry } from "@workspace/core/lib/browser-import";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  KeyRound,
  Link,
  Lock,
  Mail,
  NotebookText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

// ─── Character sets ───────────────────────────────────────────────────────────

const CHARS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

function entropy(password: string): number {
  const unique = new Set(password.split("")).size;
  if (!unique || !password.length) return 0;
  return password.length * Math.log2(unique);
}

function strengthLabel(bits: number): { label: string; color: string; width: string } {
  if (bits < 28) return { label: "Çok Zayıf", color: "bg-red-500", width: "w-[15%]" };
  if (bits < 40) return { label: "Zayıf", color: "bg-orange-500", width: "w-[30%]" };
  if (bits < 55) return { label: "Orta", color: "bg-yellow-500", width: "w-[50%]" };
  if (bits < 70) return { label: "İyi", color: "bg-lime-500", width: "w-[75%]" };
  return { label: "Güçlü", color: "bg-emerald-500", width: "w-full" };
}

function OptionPill({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors select-none",
        checked && !disabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent bg-muted/60 text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {label}
    </button>
  );
}

// ─── Password Generator ───────────────────────────────────────────────────────

function PasswordGenerator({ onUse }: { onUse: (pw: string) => void }) {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const activeCount = [useUpper, useLower, useDigits, useSymbols].filter(Boolean).length;

  const generate = useCallback(() => {
    const pool = [
      useUpper ? CHARS.upper : "",
      useLower ? CHARS.lower : "",
      useDigits ? CHARS.digits : "",
      useSymbols ? CHARS.symbols : "",
    ].join("");
    if (!pool) return;
    const guaranteed: string[] = [];
    if (useUpper) guaranteed.push(CHARS.upper[Math.floor(Math.random() * CHARS.upper.length)] as string);
    if (useLower) guaranteed.push(CHARS.lower[Math.floor(Math.random() * CHARS.lower.length)] as string);
    if (useDigits) guaranteed.push(CHARS.digits[Math.floor(Math.random() * CHARS.digits.length)] as string);
    if (useSymbols) guaranteed.push(CHARS.symbols[Math.floor(Math.random() * CHARS.symbols.length)] as string);
    const rest = Array.from({ length: length - guaranteed.length }, () =>
      pool[Math.floor(Math.random() * pool.length)]
    );
    const all = [...guaranteed, ...rest];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setGenerated(all.join(""));
    setCopied(false);
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bits = entropy(generated);
  const strength = strengthLabel(bits);

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">Şifre Üretici</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border bg-background px-3 py-2 font-mono text-sm tracking-widest overflow-hidden whitespace-nowrap select-all truncate">
          {generated || "—"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={generate}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-300", strength.color, strength.width)} />
        </div>
        <p className={cn("text-[11px] font-medium", strength.color.replace("bg-", "text-"))}>
          {strength.label}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Uzunluk</span>
          <span className="text-xs font-mono font-semibold tabular-nums">{length}</span>
        </div>
        <input
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full accent-primary h-1.5 cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>8</span><span>64</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <OptionPill label="A–Z" checked={useUpper} onChange={setUseUpper} disabled={activeCount === 1 && useUpper} />
        <OptionPill label="a–z" checked={useLower} onChange={setUseLower} disabled={activeCount === 1 && useLower} />
        <OptionPill label="0–9" checked={useDigits} onChange={setUseDigits} disabled={activeCount === 1 && useDigits} />
        <OptionPill label="!@#…" checked={useSymbols} onChange={setUseSymbols} disabled={activeCount === 1 && useSymbols} />
      </div>
      <Button type="button" size="sm" className="w-full" onClick={() => generated && onUse(generated)} disabled={!generated}>
        Bu şifreyi kullan
      </Button>
    </div>
  );
}

// ─── Category Combobox ────────────────────────────────────────────────────────

function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const { categories } = useCategoriesStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? categories.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : categories;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          placeholder="örn. Oyun, Banka, E-posta"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setOpen(false);
          }}
          autoComplete="off"
          className="pr-8"
        />
        <ChevronDown
          className={cn(
            "absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </div>

      {open && categories.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 shadow-md">
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(cat);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                value === cat && "bg-accent/50 font-medium"
              )}
            >
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ─── Password Form ────────────────────────────────────────────────────────────

type FormValues = Omit<VaultEntry, "id" | "createdAt" | "updatedAt">;

function PasswordForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<FormValues>({
    title: initial?.title ?? "",
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    url: initial?.url ?? "",
    notes: initial?.notes ?? "",
    category: initial?.category ?? "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!values.title.trim()) { setError("Başlık zorunludur."); return; }
    if (!values.password.trim()) { setError("Şifre zorunludur."); return; }
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="f-title">Başlık <span className="text-destructive">*</span></Label>
          <Input id="f-title" placeholder="örn. GitHub, Google, Netflix" value={values.title} onChange={set("title")} autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-username">
            E-posta / Kullanıcı adı
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">opsiyonel</span>
          </Label>
          <Input id="f-username" placeholder="john@example.com" value={values.username} onChange={set("username")} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="f-password">Şifre <span className="text-destructive">*</span></Label>
            <button
              type="button"
              onClick={() => setShowGenerator((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Wand2 className="size-3.5" />
              {showGenerator ? "Gizle" : "Üret"}
            </button>
          </div>
          <div className="relative">
            <Input
              id="f-password"
              type={showPw ? "text" : "password"}
              placeholder="Şifrenizi girin veya yapıştırın"
              value={values.password}
              onChange={set("password")}
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {showGenerator && (
            <PasswordGenerator
              onUse={(pw) => {
                setValues((v) => ({ ...v, password: pw }));
                setShowPw(true);
                setShowGenerator(false);
              }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-url">
            URL
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">opsiyonel</span>
          </Label>
          <Input id="f-url" placeholder="https://example.com" value={values.url} onChange={set("url")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-category">
            Kategori
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">opsiyonel</span>
          </Label>
          <CategoryCombobox
            value={values.category}
            onChange={(val) => setValues((v) => ({ ...v, category: val }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-notes">
            Notlar
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">opsiyonel</span>
          </Label>
          <textarea
            id="f-notes"
            rows={3}
            placeholder="Kurtarma kodları, güvenlik soruları…"
            value={values.notes}
            onChange={set("notes")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      <DialogFooter className="pt-4 border-t mt-4">
        <DialogClose asChild>
          <Button variant="outline" type="button" disabled={saving}>İptal</Button>
        </DialogClose>
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? "Kaydediliyor…" : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Password Card ────────────────────────────────────────────────────────────

function PasswordCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card transition-all hover:shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="size-4 text-primary" />
        </div>
        <span className="flex-1 truncate font-semibold">{entry.title}</span>
        {entry.category && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {entry.category}
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-px p-2">
        {entry.username && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
            <Mail className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="flex-1 truncate text-sm text-muted-foreground">{entry.username}</span>
            <CopyButton value={entry.username} />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
          <KeyRound className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span className="flex-1 truncate font-mono text-sm tracking-wider">
            {visible ? entry.password : "•".repeat(Math.min(entry.password.length, 16))}
          </span>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <CopyButton value={entry.password} />
        </div>

        {entry.url && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
            <Link className="size-3.5 shrink-0 text-muted-foreground/60" />
            <button
              type="button"
              className="flex-1 truncate text-left text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={() => {
                const url = entry.url.startsWith("http") ? entry.url : `https://${entry.url}`;
                if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
                  import("@tauri-apps/plugin-opener").then(({ open }) => open(url));
                } else {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              {entry.url}
            </button>
            <CopyButton value={entry.url} />
          </div>
        )}

        {entry.notes && (
          <div className="mt-1 flex items-start gap-2 rounded-lg border-t px-2 pt-2.5 pb-1.5">
            <NotebookText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
            <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Şifreyi Sil</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Bu kayıt kalıcı olarak silinecek. Emin misiniz?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>İptal</Button>
          <Button variant="destructive" onClick={onConfirm}>Sil</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Browser Import Dialog ────────────────────────────────────────────────────

const BROWSER_LABELS: Record<string, { bg: string; text: string }> = {
  Chrome:     { bg: "bg-blue-500/10",   text: "text-blue-500" },
  Firefox:    { bg: "bg-orange-500/10", text: "text-orange-500" },
  Safari:     { bg: "bg-sky-500/10",    text: "text-sky-500" },
  Edge:       { bg: "bg-teal-500/10",   text: "text-teal-500" },
  Bitwarden:  { bg: "bg-indigo-500/10", text: "text-indigo-500" },
  LastPass:   { bg: "bg-red-500/10",    text: "text-red-500" },
  "1Password":{ bg: "bg-blue-600/10",   text: "text-blue-600" },
  Diğer:      { bg: "bg-muted",         text: "text-muted-foreground" },
};

function BrowserImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { bulkAddEntries } = useVaultStore();
  const { addCategory } = useCategoriesStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<BrowserImportEntry[]>([]);
  const [browser, setBrowser] = useState<string>("");
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setEntries([]);
    setBrowser("");
    setSkipped(0);
    setError("");
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (file: File) => {
    setError("");
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseBrowserCSV((ev.target?.result as string) ?? "");
        if (result.entries.length === 0) {
          setError("Dosyada içe aktarılabilir şifre bulunamadı.");
          return;
        }
        setEntries(result.entries);
        setBrowser(result.detectedBrowser);
        setSkipped(result.skipped);
      } catch {
        setError("Dosya okunamadı. Lütfen geçerli bir CSV seçin.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    setLoading(true);
    setError("");
    try {
      await bulkAddEntries(entries);
      const cats = [...new Set(entries.map((e) => e.category).filter(Boolean))];
      cats.forEach(addCategory);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const colors = BROWSER_LABELS[browser] ?? BROWSER_LABELS["Diğer"];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            Tarayıcıdan İçe Aktar
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="size-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold">İçe aktarma tamamlandı</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {entries.length} şifre başarıyla eklendi.
              </p>
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Kapat</Button>
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", colors?.bg, colors?.text)}>
                  {browser}
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{entries.length}</strong> şifre bulundu
                  {skipped > 0 && `, ${skipped} atlandı`}
                </span>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Değiştir
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {entries.map((e, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: preview list, stable order
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <KeyRound className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    {e.username && (
                      <p className="truncate text-xs text-muted-foreground">{e.username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={reset} type="button">Geri</Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "İçe Aktarılıyor…" : `${entries.length} Şifreyi İçe Aktar`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Chrome, Firefox, Safari, Edge, Bitwarden, LastPass ve 1Password'den dışa aktarılan CSV dosyalarını destekler.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {Object.keys(BROWSER_LABELS).filter(b => b !== "Diğer").map((b) => {
                const c = BROWSER_LABELS[b];
                return (
                  <span
                    key={b}
                    className={cn("rounded-full px-2 py-0.5 text-xs font-medium", c?.bg, c?.text)}
                  >
                    {b}
                  </span>
                );
              })}
            </div>

            <div
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">CSV dosyasını buraya sürükleyin</p>
                <p className="mt-0.5 text-xs text-muted-foreground">veya seçmek için tıklayın</p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">İptal</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Dialog ────────────────────────────────────────────────────────────

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { importVault } = useVaultStore();
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) { setError("Lütfen bir dosya seçin."); return; }
    if (!password) { setError("Lütfen vault şifresini girin."); return; }
    setLoading(true);
    setError("");
    try {
      await importVault(file, password);
      onOpenChange(false);
    } catch {
      setError("Dosya açılamadı. Şifrenizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vault İçe Aktar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vault Dosyası (.psv)</Label>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4 shrink-0" />
              {file ? file.name : "Dosya seçmek için tıklayın"}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".psv,.json"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-pw">Ana Şifre</Label>
            <Input
              id="import-pw"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">İptal</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "İçe Aktarılıyor…" : "İçe Aktar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PasswordsPage() {
  const { status, vault, lock, exportVault, addEntry, updateEntry, deleteEntry } = useVaultStore();
  const { activeCategory, addCategory } = useCategoriesStore();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<VaultEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [browserImportOpen, setBrowserImportOpen] = useState(false);

  const entries = (vault?.entries ?? []).filter(
    (e) =>
      (activeCategory === null || e.category === activeCategory) &&
      (e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.username.toLowerCase().includes(search.toLowerCase()) ||
        e.url.toLowerCase().includes(search.toLowerCase()))
  );

  if (status !== "unlocked") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Lock className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Vault kilitli.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Şifrelerim</h1>
          <p className="text-xs text-muted-foreground">
            {vault?.entries.length ?? 0} kayıt · AES-256-GCM ile şifreli
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBrowserImportOpen(true)}
            title="Tarayıcıdan içe aktar"
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Globe className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            title="Vault dosyasından içe aktar"
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Upload className="size-4" />
          </button>
          <button
            type="button"
            onClick={exportVault}
            title="Dışa aktar"
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            onClick={lock}
            title="Kilitle"
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Lock className="size-4" />
          </button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Plus className="mr-1.5 size-4" />
                Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Şifre Ekle</DialogTitle>
              </DialogHeader>
              <PasswordForm
                onSubmit={async (data) => {
                  await addEntry(data);
                  if (data.category.trim()) addCategory(data.category.trim());
                  setAddOpen(false);
                }}
                submitLabel="Ekle"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="border-b px-6 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Başlık, kullanıcı adı veya URL ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <KeyRound className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {search ? "Sonuç bulunamadı" : "Henüz şifre eklenmedi"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "Farklı bir arama terimi deneyin."
                  : "İlk şifrenizi ekleyin — şifreli olarak saklanacak."}
              </p>
            </div>
            {!search && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                İlk şifreyi ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <PasswordCard
                key={entry.id}
                entry={entry}
                onEdit={() => setEditEntry(entry)}
                onDelete={() => setDeleteId(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Şifreyi Düzenle</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <PasswordForm
              key={editEntry.id}
              initial={editEntry}
              onSubmit={async (data) => {
                await updateEntry(editEntry.id, data);
                if (data.category.trim()) addCategory(data.category.trim());
                setEditEntry(null);
              }}
              submitLabel="Kaydet"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onConfirm={async () => {
          if (deleteId) {
            await deleteEntry(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Browser import dialog */}
      <BrowserImportDialog open={browserImportOpen} onOpenChange={setBrowserImportOpen} />
    </div>
  );
}
